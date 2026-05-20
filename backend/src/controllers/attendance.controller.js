import { Attendance } from '../models/attendance.model.js';

// Helper to determine late entry status (e.g., Threshold at 09:00 AM)
const checkIsLate = (checkInDate) => {
  const hour = checkInDate.getUTCHours();
  const minute = checkInDate.getUTCMinutes();
  return (hour > 9 || (hour === 9 && minute > 0));
};

// Helper to calculate total active shift hours and overtime balances
const calculateHoursMetrics = (checkInStr, checkOutStr) => {
  const start = new Date(checkInStr);
  const end = new Date(checkOutStr);
  const diffMs = Math.max(0, end - start);
  const totalHours = diffMs / 3600000;
  
  // Assuming a standard shift structure of 8 working hours
  const STANDARD_SHIFT = 8.0;
  const overtimeHours = Math.max(0, totalHours - STANDARD_SHIFT);

  return {
    working_hours: totalHours.toFixed(2),
    overtime: overtimeHours.toFixed(2)
  };
};

// GET /api/attendance/:date - Returns all logs for a specific day
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const records = await Attendance.find({ date });
    
    // Returns as an array of objects matching your frontend lookup layout structure
    res.json(records);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};

// POST /api/attendance/check-in - Handles daily shift initialization
export const checkIn = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted safely from the authentication payload
    const todayStr = new Date().toISOString().split('T')[0];
    const nowISO = new Date().toISOString();

    // Prevent duplicate initializations for the same day
    const existingRecord = await Attendance.findOne({ user_id: userId, date: todayStr });
    if (existingRecord && existingRecord.check_in_time) {
      return res.status(400).json({ detail: "Active session has already been initialized for today." });
    }

    const isLate = checkIsLate(new Date(nowISO));

    const record = await Attendance.findOneAndUpdate(
      { user_id: userId, date: todayStr },
      {
        user_id: userId,
        date: todayStr,
        status: 'PRESENT',
        check_in_time: nowISO,
        is_late: isLate
      },
      { upsert: true, new: true }
    );

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};

// POST /api/attendance/check-out - Closes out the daily shift session
export const checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];
    const nowISO = new Date().toISOString();

    const record = await Attendance.findOne({ user_id: userId, date: todayStr });
    if (!record || !record.check_in_time) {
      return res.status(400).json({ detail: "No active session found to terminate." });
    }
    if (record.check_out_time) {
      return res.status(400).json({ detail: "This session has already been terminated." });
    }

    const { working_hours, overtime } = calculateHoursMetrics(record.check_in_time, nowISO);

    record.check_out_time = nowISO;
    record.working_hours = working_hours;
    record.overtime = overtime;
    await record.save();

    res.json(record);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};