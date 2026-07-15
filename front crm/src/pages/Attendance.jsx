// ===============================
// FRONTEND: Attendance.jsx
// ===============================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  LogIn,
  LogOut,
  History,
  ShieldCheck,
  Timer,
  Loader2,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Coffee,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;
// ===============================
// HELPERS
// ===============================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getISTDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata'
  }).format(new Date());
};

const parseAsUTC = (dateInput) => {
  if (!dateInput) return null;

  if (dateInput instanceof Date) {
    return dateInput;
  }

  const value = String(dateInput);

  return new Date(value.endsWith('Z') ? value : `${value}Z`);
};

const formatToISTFull = (dateInput) => {
  if (!dateInput) return '---';

  try {
    return parseAsUTC(dateInput).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  } catch {
    return '---';
  }
};

const formatTime = (dateInput) => {
  if (!dateInput) return '---';

  try {
    return parseAsUTC(dateInput).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '---';
  }
};

const calculateWorkingHours = (checkIn, checkOut) => {
  if (!checkIn) return "0.00";

  const start = parseAsUTC(checkIn);
  const end = checkOut ? parseAsUTC(checkOut) : new Date();

  return Math.max(
    0,
    (end.getTime() - start.getTime()) / 3600000
  ).toFixed(2);
};

// ===============================
// LIVE CLOCK
// ===============================

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div className="flex items-baseline gap-4 mb-4">
        <div className="text-8xl lg:text-[10rem] font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none select-none">
          {time.getHours().toString().padStart(2, '0')}
          <span className="animate-pulse text-indigo-500">:</span>
          {time.getMinutes().toString().padStart(2, '0')}
        </div>

        <div className="text-2xl lg:text-4xl font-mono text-indigo-500/50 font-bold w-12">
          {time.getSeconds().toString().padStart(2, '0')}
        </div>
      </div>

      <p className="text-[10px] tracking-[0.5em] text-slate-600 dark:text-slate-400 font-black uppercase mb-12">
        Universal Time Protocol
      </p>
    </>
  );
};

// ===============================
// MAIN COMPONENT
// ===============================

const Attendance = () => {
  const navigate = useNavigate();

  // Detect logged-in user role
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  const userRoleId = String(currentUser.role_id || currentUser.roleId || '').toLowerCase();
  const userRole   = String(currentUser.role || '').toLowerCase();
  const isAdmin    = ['1', '2', 'hr', 'admin'].includes(userRoleId) || ['hr', 'admin'].includes(userRole);
  const isManager  = isAdmin || userRoleId === '3' || userRole === 'manager';

  // Active view: 'self' | 'team'
  const [activeView, setActiveView] = useState(isManager ? 'team' : 'self');
        console.error("Failed to parse user for admin check:", err);
      }
    }
  }, [navigate]);

  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Team view state (Admin/Manager)
  const [teamDate, setTeamDate] = useState(getISTDate());
  const [teamRecords, setTeamRecords] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Calendar and Selected Date States
  const [selectedDate, setSelectedDate] = useState(getISTDate());
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [showCalendar, setShowCalendar] = useState(false);

  const prevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const daysInMonth = useMemo(() => {
    return new Date(calendarYear, calendarMonth + 1, 0).getDate();
  }, [calendarYear, calendarMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(calendarYear, calendarMonth, 1).getDay();
  }, [calendarYear, calendarMonth]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getHeaders = () => {
    const rawToken = localStorage.getItem('token');
    const token = rawToken ? rawToken.replace(/"/g, '') : '';

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);

      const todayStr = getISTDate();

      const response = await fetch(
        `${API_BASE}/attendance/${todayStr}`,
        {
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        setTodayLog(null);
        return;
      }

      const data = await response.json();

      setTodayLog(data || null);
    } catch {
      setError("System Sync Failed");
      setTodayLog(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const fetchSelectedDateStatus = useCallback(async (dateStr) => {
    try {
      setSelectedLoading(true);
      const response = await fetch(
        `${API_BASE}/attendance/${dateStr}`,
        {
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        setSelectedLog(null);
        return;
      }

      const data = await response.json();
      setSelectedLog(data || null);
    } catch {
      setSelectedLog(null);
    } finally {
      setSelectedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSelectedDateStatus(selectedDate);
  }, [selectedDate, fetchSelectedDateStatus]);

  const handleAction = async (type) => {
    setError(null);
    setSuccessMsg(null);
    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/attendance/${type}`,
        { method: 'POST', headers: getHeaders() }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.detail || 'Action denied');

      setSuccessMsg(`${type.replace('-', ' ')} successful!`);
      await fetchStatus();
      if (selectedDate === getISTDate()) fetchSelectedDateStatus(selectedDate);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreak = async (type) => {
    setError(null);
    setBreakLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/attendance/break/${type}`,
        { method: 'POST', headers: getHeaders() }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Break action failed');
      setSuccessMsg(type === 'start' ? 'Break started.' : 'Break ended.');
      await fetchStatus();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setBreakLoading(false);
    }
  };

  const fetchTeamAttendance = useCallback(async (dateStr) => {
    try {
      setTeamLoading(true);
      const response = await fetch(
        `${API_BASE}/attendance/all/${dateStr}`,
        { headers: getHeaders() }
      );
      if (!response.ok) { setTeamRecords([]); return; }
      const data = await response.json();
      setTeamRecords(Array.isArray(data) ? data : []);
    } catch { setTeamRecords([]); }
    finally { setTeamLoading(false); }
  }, []);

  useEffect(() => {
    if (isManager && activeView === 'team') fetchTeamAttendance(teamDate);
  }, [isManager, activeView, teamDate, fetchTeamAttendance]);

  const liveWorkingHours = useMemo(() => {
    if (!todayLog?.check_in_time) return "0.00";

    if (todayLog?.check_out_time) {
      return calculateWorkingHours(
        todayLog.check_in_time,
        todayLog.check_out_time
      );
    }

    return calculateWorkingHours(
      todayLog.check_in_time,
      currentTime
    );
  }, [todayLog, currentTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c10] flex items-center justify-center">
        <Loader2 className="text-indigo-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-12 text-slate-600 dark:text-slate-200 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-5xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none"
            >
              STAFF.
              <span className="text-indigo-500">
                LOG
              </span>
            </motion.h2>

            <div className="flex items-center gap-2 mt-4">
              <div
                className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                  todayLog?.check_in_time && !todayLog?.check_out_time
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                }`}
              />

              <p className="text-[10px] font-bold uppercase tracking-[0.4em]">
                Network Status:
                <span className="ml-2">
                  {todayLog?.check_in_time &&
                  !todayLog?.check_out_time
                    ? 'SECURE_ONLINE'
                    : 'TERMINATED'}
                </span>
              </p>
            </div>
          </div>

          <div className="hidden md:block bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border">
            {currentTime.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              timeZone: 'Asia/Kolkata'
            }).toUpperCase()}
          </div>
        </header>

        {/* VIEW TOGGLE TABS — Only visible to Admin/HR/Manager */}
        {isManager && (
          <div className="flex gap-3 mb-10">
            {[{ id: 'self', label: 'My Attendance', icon: ShieldCheck }, { id: 'team', label: 'Team Overview', icon: Users }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer ${
                  activeView === tab.id
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* TEAM OVERVIEW PANEL — Admin/HR/Manager only */}
        {isManager && activeView === 'team' && (
          <div className="mb-10">
            <div className="bg-white dark:bg-slate-900 border rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black tracking-[0.3em] text-indigo-500 uppercase">Team Attendance</h3>
                <input
                  type="date"
                  value={teamDate}
                  onChange={(e) => setTeamDate(e.target.value)}
                  className="text-xs bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                />
              </div>

              {teamLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
              ) : teamRecords.length === 0 ? (
                <div className="text-center py-10">
                  <Users size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No attendance records for {teamDate}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b dark:border-slate-800">
                        <th className="text-left pb-3 pr-4">Employee</th>
                        <th className="text-left pb-3 pr-4">Status</th>
                        <th className="text-left pb-3 pr-4">In Time</th>
                        <th className="text-left pb-3 pr-4">Out Time</th>
                        <th className="text-left pb-3">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {teamRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-200">
                            {r.user?.name || r.user_id || '—'}
                            {r.user?.employeeId && <span className="ml-2 text-slate-400">#{r.user.employeeId}</span>}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              r.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500' :
                              r.status === 'LATE'    ? 'bg-orange-500/10 text-orange-500' :
                              r.status === 'ABSENT'  ? 'bg-red-500/10 text-red-500' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>{r.status || '—'}</span>
                          </td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{formatTime(r.check_in_time)}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{formatTime(r.check_out_time)}</td>
                          <td className="py-3 font-bold text-indigo-400">{r.working_hours ? `${r.working_hours}h` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8"
            >
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-widest">
                <AlertTriangle size={14} />
                {error}
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8"
            >
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 size={14} />
                {successMsg}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* LEFT */}
          <div className="lg:col-span-8 space-y-10">

            {/* MAIN */}
            <div className="relative group">
              <div className="relative bg-white dark:bg-slate-900 border rounded-[3rem] p-12 lg:p-24 flex flex-col items-center overflow-hidden shadow-xl">

                <Fingerprint className="absolute -bottom-10 -right-10 text-slate-100 dark:text-slate-950/20 w-64 h-64 -rotate-12" />

                <LiveClock />

                <div className="grid grid-cols-2 gap-6 w-full max-w-md relative z-10">

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={
                      actionLoading ||
                      (todayLog?.check_in_time &&
                        !todayLog?.check_out_time)
                    }
                    onClick={() => handleAction('check-in')}
                    className="bg-emerald-500 disabled:opacity-30 hover:bg-emerald-600 p-6 rounded-3xl text-slate-900 font-bold flex flex-col items-center gap-3 cursor-pointer"
                  >
                    <LogIn size={24} />
                    <span className="text-xs uppercase tracking-widest">
                      Initialize
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={
                      actionLoading ||
                      !todayLog?.check_in_time ||
                      todayLog?.check_out_time
                    }
                    onClick={() => handleAction('check-out')}
                    className="bg-red-500 disabled:opacity-30 hover:bg-red-600 p-6 rounded-3xl text-white font-bold flex flex-col items-center gap-3 cursor-pointer"
                  >
                    <LogOut size={24} />
                    <span className="text-xs uppercase tracking-widest">
                      Terminate
                    </span>
                  </motion.button>

                </div>
              </div>
            </div>

            {/* STATS — 6 blocks: Date | In | Out | Hours | Overtime | Status */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

              <StatBlock
                label="Session Date"
                value={todayLog?.date || getISTDate()}
                icon={History}
                color="text-slate-400"
              />

              <StatBlock
                label="In Time"
                value={formatTime(todayLog?.check_in_time)}
                icon={LogIn}
                color="text-indigo-400"
              />

              <StatBlock
                label="Out Time"
                value={formatTime(todayLog?.check_out_time)}
                icon={LogOut}
                color="text-rose-400"
              />

              <StatBlock
                label="Work Hours"
                value={`${liveWorkingHours}h`}
                icon={Timer}
                color="text-emerald-400"
              />

              <StatBlock
                label="Overtime"
                value={`${todayLog?.overtime || '0.00'}h`}
                icon={TrendingUp}
                color="text-amber-400"
              />

              <StatBlock
                label="Status"
                value={
                  todayLog?.is_late
                    ? 'LATE_ENTRY'
                    : todayLog?.check_in_time
                      ? 'OPTIMAL'
                      : 'NOT_CLOCKED'
                }
                icon={Activity}
                color={
                  todayLog?.is_late
                    ? 'text-orange-500'
                    : todayLog?.check_in_time
                      ? 'text-indigo-400'
                      : 'text-slate-400'
                }
              />

            </div>

            {/* BREAK BUTTONS — only visible when checked in but not yet checked out */}
            {todayLog?.check_in_time && !todayLog?.check_out_time && (
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={breakLoading || (todayLog?.break_start && !todayLog?.break_end)}
                  onClick={() => handleBreak('start')}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 text-amber-500 rounded-2xl text-xs font-bold uppercase tracking-widest disabled:opacity-30 cursor-pointer transition-all"
                >
                  <Coffee size={14} />
                  Start Break
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={breakLoading || !todayLog?.break_start || !!todayLog?.break_end}
                  onClick={() => handleBreak('end')}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-400 rounded-2xl text-xs font-bold uppercase tracking-widest disabled:opacity-30 cursor-pointer transition-all"
                >
                  <Zap size={14} />
                  End Break {todayLog?.break_start && !todayLog?.break_end ? '(Active)' : ''}
                </motion.button>
              </div>
            )}

          </div>

          {/* RIGHT */}
          <aside className="lg:col-span-4">
            
            {/* SELECTED DATE DETAILS & DROPDOWN CALENDAR */}
            <div className="bg-white dark:bg-slate-900 border rounded-[2.5rem] p-8 shadow-sm relative">
              
              <div className="flex justify-between items-center mb-6 relative">
                <h2 className="text-[10px] font-black tracking-[0.3em] text-indigo-500 uppercase">
                  Registry Logs
                </h2>
                
                {/* Date Dropdown Button */}
                <div className="relative">
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
                  >
                    <Calendar size={13} className="text-indigo-500" />
                    <span>{selectedDate === getISTDate() ? 'Today' : selectedDate}</span>
                  </button>

                  {/* Dropdown Calendar Popup */}
                  {showCalendar && (
                    <>
                      {/* Invisible backdrop to close dropdown on click outside */}
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setShowCalendar(false)}
                      />
                      
                      <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl z-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black uppercase text-indigo-500">Select Date</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); prevMonth(); }} 
                              className="p-1 hover:bg-slate-105 dark:hover:bg-slate-900 rounded text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); nextMonth(); }} 
                              className="p-1 hover:bg-slate-105 dark:hover:bg-slate-900 rounded text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="text-center font-bold text-slate-800 dark:text-slate-200 mb-2 text-xs">
                          {MONTH_NAMES[calendarMonth]} {calendarYear}
                        </div>

                        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="py-0.5">{d}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}
                          
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${calendarYear}-${(calendarMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const isSelected = dateStr === selectedDate;
                            const isToday = dateStr === getISTDate();

                            return (
                              <button
                                key={day}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(dateStr);
                                  setShowCalendar(false);
                                }}
                                className={`text-[11px] p-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                                    : isToday
                                      ? 'border border-indigo-500/50 text-indigo-500 hover:bg-indigo-500/10'
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedLoading ? (
                <div className="py-8 flex justify-center items-center">
                  <Loader2 className="text-indigo-500 animate-spin" size={24} />
                </div>
              ) : selectedLog ? (
                <div className="space-y-6">
                  <DetailRow
                    label="System Check-In"
                    value={formatToISTFull(selectedLog.check_in_time)}
                  />

                  <DetailRow
                    label="System Check-Out"
                    value={formatToISTFull(selectedLog.check_out_time)}
                  />

                  <DetailRow
                    label="Accrued Hours"
                    value={`${calculateWorkingHours(selectedLog.check_in_time, selectedLog.check_out_time)} HRS`}
                  />

                  <DetailRow
                    label="Entry Status"
                    value={selectedLog.is_late ? "LATE_ENTRY" : "OPTIMAL"}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock size={24} className="mx-auto text-slate-350 dark:text-slate-650 mb-2" />
                  <p className="text-xs text-slate-550 dark:text-slate-450 font-medium">No record for this date.</p>
                </div>
              )}

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

const StatBlock = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-slate-900 border p-6 rounded-[2rem] shadow-sm">
    <Icon size={18} className={`mb-4 ${color}`} />

    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">
      {label}
    </p>

    <p className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
      {value}
    </p>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
      {label}
    </p>

    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
      {value}
    </p>
  </div>
);

export default Attendance;