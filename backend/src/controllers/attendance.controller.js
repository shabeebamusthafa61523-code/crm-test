// ===============================
// BACKEND: attendance.controller.js
// ===============================

import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import { recordAudit } from '../middleware/audit.middleware.js';

// ─── IST Date Helpers ─────────────────────────────────────────────────────────

const getISTDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata'
  }).format(new Date());
};

/**
 * Check if check-in time is late based on a configurable shift_start (HH:MM IST).
 * Default threshold: 09:00 IST.
 */
const checkIsLate = (dateObj, shiftStart = '09:00') => {
  try {
    const istTime = dateObj.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const [hours, minutes] = istTime.split(':').map(Number);
    const [shiftHour, shiftMin] = shiftStart.split(':').map(Number);

    return hours > shiftHour || (hours === shiftHour && minutes > shiftMin);
  } catch {
    return false;
  }
};

const calculateShiftMetrics = (checkIn, checkOut, breakDurationMin = 0) => {
  try {
    const totalMs = checkOut.getTime() - checkIn.getTime();
    const breakMs = breakDurationMin * 60 * 1000;
    const netMs = Math.max(0, totalMs - breakMs);
    const totalHours = netMs / (1000 * 60 * 60);
    const overtime = Math.max(0, totalHours - 8);

    return {
      working_hours: totalHours.toFixed(2),
      overtime: overtime.toFixed(2)
    };
  } catch {
    return { working_hours: '0.00', overtime: '0.00' };
  }
};

const serializeAttendance = (record) => {
  if (!record) return null;
  const obj = record.toObject ? record.toObject() : record;
  return {
    ...obj,
    id: obj._id?.toString(),
    user_id: obj.user_id?.toString()
  };
};

// Role helpers
const ADMIN_ROLES = ['1', '2', 'hr', 'admin'];
const MANAGER_ROLES = [...ADMIN_ROLES, '3', 'manager'];

const isAdminOrHR = (user) => {
  const role = String(user?.role || '').toLowerCase();
  const roleId = String(user?.role_id || '');
  return ADMIN_ROLES.includes(role) || ADMIN_ROLES.includes(roleId);
};

const isManagerOrAbove = (user) => {
  const role = String(user?.role || '').toLowerCase();
  const roleId = String(user?.role_id || '');
  return MANAGER_ROLES.includes(role) || MANAGER_ROLES.includes(roleId);
};

// ─── CHECK IN ─────────────────────────────────────────────────────────────────

export const checkIn = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });

    const userId = req.user.id || req.user._id;
    const todayStr = getISTDate();
    const now = new Date();

    // Fetch user's shift preference if available
    const userDoc = await User.findById(userId).select('shift shift_start').lean();
    const shift = userDoc?.shift || 'morning';
    const shiftStart = userDoc?.shift_start || '09:00';

    const existing = await Attendance.findOne({ user_id: userId, date: todayStr });
    if (existing?.check_in_time) {
      return res.status(400).json({ detail: 'Already checked in today.' });
    }

    const isLate = checkIsLate(now, shiftStart);

    const record = await Attendance.findOneAndUpdate(
      { user_id: userId, date: todayStr },
      {
        $set: {
          user_id: userId,
          date: todayStr,
          status: isLate ? 'LATE' : 'PRESENT',
          check_in_time: now,
          is_late: isLate,
          shift,
          shift_start: shiftStart
        }
      },
      { upsert: true, new: true }
    );

    await recordAudit(req, {
      action: 'CHECK_IN',
      entity: 'Attendance',
      entityId: record._id,
      newValue: { date: todayStr, is_late: isLate, shift }
    });

    return res.status(201).json(serializeAttendance(record));
  } catch (error) {
    console.error('checkIn error:', error);
    return res.status(500).json({ detail: error.message });
  }
};

// ─── CHECK OUT ────────────────────────────────────────────────────────────────

export const checkOut = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });

    const userId = req.user.id || req.user._id;
    const todayStr = getISTDate();

    const record = await Attendance.findOne({ user_id: userId, date: todayStr });

    if (!record?.check_in_time) {
      return res.status(400).json({ detail: 'Please check in first.' });
    }
    if (record.check_out_time) {
      return res.status(400).json({ detail: 'Already checked out.' });
    }

    const now = new Date();
    const metrics = calculateShiftMetrics(record.check_in_time, now, record.break_duration || 0);

    const oldValue = record.toJSON();
    record.check_out_time = now;
    record.working_hours = metrics.working_hours;
    record.overtime = metrics.overtime;
    // Keep LATE status if already marked, else PRESENT
    if (record.status === 'PRESENT' || record.status === 'LATE') {
      record.status = record.is_late ? 'LATE' : 'PRESENT';
    }

    await record.save();

    await recordAudit(req, {
      action: 'CHECK_OUT',
      entity: 'Attendance',
      entityId: record._id,
      oldValue,
      newValue: record.toJSON()
    });

    return res.status(200).json(serializeAttendance(record));
  } catch (error) {
    console.error('checkOut error:', error);
    return res.status(500).json({ detail: error.message });
  }
};

// ─── BREAK START ──────────────────────────────────────────────────────────────

export const startBreak = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });

    const userId = req.user.id || req.user._id;
    const todayStr = getISTDate();

    const record = await Attendance.findOne({ user_id: userId, date: todayStr });

    if (!record?.check_in_time) {
      return res.status(400).json({ detail: 'You must check in before starting a break.' });
    }
    if (record.check_out_time) {
      return res.status(400).json({ detail: 'Your shift has already ended.' });
    }
    if (record.break_start && !record.break_end) {
      return res.status(400).json({ detail: 'Break already in progress.' });
    }

    record.break_start = new Date();
    record.break_end = null;
    await record.save();

    return res.status(200).json({ message: 'Break started.', break_start: record.break_start });
  } catch (error) {
    return res.status(500).json({ detail: error.message });
  }
};

// ─── BREAK END ────────────────────────────────────────────────────────────────

export const endBreak = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });

    const userId = req.user.id || req.user._id;
    const todayStr = getISTDate();

    const record = await Attendance.findOne({ user_id: userId, date: todayStr });

    if (!record?.break_start) {
      return res.status(400).json({ detail: 'No active break to end.' });
    }
    if (record.break_end) {
      return res.status(400).json({ detail: 'Break has already ended.' });
    }

    const now = new Date();
    const durationMs = now.getTime() - record.break_start.getTime();
    const durationMin = Math.round(durationMs / 60000);

    record.break_end = now;
    record.break_duration = (record.break_duration || 0) + durationMin;
    await record.save();

    return res.status(200).json({
      message: 'Break ended.',
      break_duration_minutes: record.break_duration
    });
  } catch (error) {
    return res.status(500).json({ detail: error.message });
  }
};

// ─── MARK ABSENT (Admin/HR/Manager) ──────────────────────────────────────────

export const markAbsent = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });
    if (!isManagerOrAbove(req.user)) {
      return res.status(403).json({ detail: 'Access denied. Manager or above required.' });
    }

    const { userId, date, notes } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ detail: 'userId and date are required.' });
    }

    const record = await Attendance.findOneAndUpdate(
      { user_id: userId, date },
      {
        $set: {
          user_id: userId,
          date,
          status: 'ABSENT',
          check_in_time: null,
          check_out_time: null,
          working_hours: '0.00',
          overtime: '0.00',
          is_late: false,
          notes: notes || 'Marked absent by administrator.',
          overridden_by: req.user.id || req.user._id
        }
      },
      { upsert: true, new: true }
    );

    await recordAudit(req, {
      action: 'MARK_ABSENT',
      entity: 'Attendance',
      entityId: record._id,
      newValue: { userId, date, status: 'ABSENT' }
    });

    return res.status(200).json({
      message: `User marked absent for ${date}.`,
      record: serializeAttendance(record)
    });
  } catch (error) {
    console.error('markAbsent error:', error);
    return res.status(500).json({ detail: error.message });
  }
};

// ─── ADMIN OVERRIDE ───────────────────────────────────────────────────────────

export const adminOverride = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });
    if (!isAdminOrHR(req.user)) {
      return res.status(403).json({ detail: 'Access denied. Admin or HR required.' });
    }

    const { id } = req.params;
    const { check_in_time, check_out_time, status, notes } = req.body;

    const record = await Attendance.findById(id);
    if (!record) return res.status(404).json({ detail: 'Attendance record not found.' });

    const oldValue = record.toJSON();

    if (check_in_time) record.check_in_time = new Date(check_in_time);
    if (check_out_time) record.check_out_time = new Date(check_out_time);
    if (status) record.status = status;
    if (notes) record.notes = notes;
    record.overridden_by = req.user.id || req.user._id;

    // Recalculate metrics if both times present
    if (record.check_in_time && record.check_out_time) {
      const metrics = calculateShiftMetrics(
        record.check_in_time,
        record.check_out_time,
        record.break_duration || 0
      );
      record.working_hours = metrics.working_hours;
      record.overtime = metrics.overtime;
      record.is_late = checkIsLate(record.check_in_time, record.shift_start || '09:00');
    }

    await record.save();

    await recordAudit(req, {
      action: 'ADMIN_OVERRIDE',
      entity: 'Attendance',
      entityId: record._id,
      oldValue,
      newValue: record.toJSON()
    });

    return res.status(200).json({
      message: 'Attendance record corrected successfully.',
      record: serializeAttendance(record)
    });
  } catch (error) {
    console.error('adminOverride error:', error);
    return res.status(500).json({ detail: error.message });
  }
};

// ─── GET BY DATE (own record) ─────────────────────────────────────────────────

export const getAttendanceByDate = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });

    const userId = req.user.id || req.user._id;
    const { date } = req.params;

    const record = await Attendance.findOne({ user_id: userId, date });
    return res.status(200).json(serializeAttendance(record));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ detail: 'Server Error' });
  }
};

// ─── GET ALL BY DATE (Admin/HR/Manager only) ──────────────────────────────────

export const getAllAttendanceByDate = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });
    if (!isManagerOrAbove(req.user)) {
      return res.status(403).json({ detail: 'Access denied. Manager or above required.' });
    }

    const { date } = req.params;
    const records = await Attendance.find({ date })
      .populate('user_id', 'name email employeeId department role')
      .lean();

    return res.status(200).json(records.map(r => ({
      ...r,
      id: r._id?.toString(),
      user_id: r.user_id?._id?.toString() || r.user_id?.toString(),
      user: r.user_id
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ detail: 'Server Error' });
  }
};

// ─── GET MY HISTORY (paginated) ───────────────────────────────────────────────

export const getMyHistory = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });

    const userId = req.user.id || req.user._id;
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

    const filter = { user_id: userId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Attendance.countDocuments(filter)
    ]);

    return res.status(200).json({
      records: records.map(r => ({ ...r, id: r._id?.toString() })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ detail: 'Server Error' });
  }
};

// ─── GET ALL BY DATE RANGE (Admin/HR/Manager) ─────────────────────────────────

export const getAllByDateRange = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });
    if (!isManagerOrAbove(req.user)) {
      return res.status(403).json({ detail: 'Access denied. Manager or above required.' });
    }

    const { startDate, endDate, userId, department } = req.query;

    const filter = {};
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }

    if (userId) filter.user_id = userId;

    let records = await Attendance.find(filter)
      .populate('user_id', 'name email employeeId department departmentId role')
      .sort({ date: -1 })
      .lean();

    // Filter by department if provided
    if (department) {
      records = records.filter(r =>
        r.user_id?.department === department ||
        String(r.user_id?.departmentId) === department
      );
    }

    return res.status(200).json({
      total: records.length,
      records: records.map(r => ({
        ...r,
        id: r._id?.toString(),
        user: r.user_id,
        user_id: r.user_id?._id?.toString()
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ detail: 'Server Error' });
  }
};

// ─── MONTHLY REPORT (aggregated stats) ───────────────────────────────────────

export const getMonthlyReport = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ detail: 'Authentication required.' });

    // Can be own report, or Admin/HR can request for any user
    let { userId, year, month } = req.query;

    const selfId = String(req.user.id || req.user._id);

    if (!userId) {
      userId = selfId;
    } else if (userId !== selfId && !isManagerOrAbove(req.user)) {
      return res.status(403).json({ detail: 'Access denied. Cannot view another user\'s report.' });
    }

    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || (now.getMonth() + 1);

    // Build date prefix: YYYY-MM
    const monthStr = String(m).padStart(2, '0');
    const prefix = `${y}-${monthStr}`;

    const records = await Attendance.find({
      user_id: userId,
      date: { $regex: `^${prefix}` }
    }).lean();

    const stats = {
      year: y,
      month: m,
      total_days: records.length,
      present: 0,
      absent: 0,
      late: 0,
      half_day: 0,
      on_leave: 0,
      holiday: 0,
      total_working_hours: 0,
      total_overtime: 0,
      total_break_minutes: 0
    };

    for (const r of records) {
      const s = r.status || 'PRESENT';
      if (s === 'PRESENT') stats.present++;
      else if (s === 'ABSENT') stats.absent++;
      else if (s === 'LATE') { stats.late++; stats.present++; }
      else if (s === 'HALF_DAY') stats.half_day++;
      else if (s === 'ON_LEAVE') stats.on_leave++;
      else if (s === 'HOLIDAY') stats.holiday++;

      stats.total_working_hours += parseFloat(r.working_hours || 0);
      stats.total_overtime += parseFloat(r.overtime || 0);
      stats.total_break_minutes += parseInt(r.break_duration || 0);
    }

    stats.total_working_hours = stats.total_working_hours.toFixed(2);
    stats.total_overtime = stats.total_overtime.toFixed(2);

    return res.status(200).json({ userId, stats, records: records.map(r => ({ ...r, id: r._id?.toString() })) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ detail: 'Server Error' });
  }
};