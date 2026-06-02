// ===============================
// FRONTEND: Attendance.jsx
// ===============================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Fingerprint
} from 'lucide-react';

const API_BASE = "/api";

// ===============================
// HELPERS
// ===============================

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
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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

  const handleAction = async (type) => {
    setError(null);
    setSuccessMsg(null);
    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/attendance/${type}`,
        {
          method: 'POST',
          headers: getHeaders()
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Action denied");
      }

      setSuccessMsg(`${type.replace('-', ' ')} successful!`);

      await fetchStatus();

      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);

    } catch (err) {
      setError(err.message);

      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setActionLoading(false);
    }
  };

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
        <header className="flex justify-between items-end mb-16">
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

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <StatBlock
                label="Session Date"
                value={todayLog?.date || getISTDate()}
                icon={History}
                color="text-slate-400"
              />

              <StatBlock
                label="In Time"
                value={formatTime(todayLog?.check_in_time)}
                icon={Clock}
                color="text-indigo-400"
              />

              <StatBlock
                label="Work Hours"
                value={`${liveWorkingHours}h`}
                icon={Timer}
                color="text-emerald-400"
              />

              <StatBlock
                label="Status"
                value={
                  todayLog?.is_late
                    ? "LATE_ENTRY"
                    : "OPTIMAL"
                }
                icon={Activity}
                color={
                  todayLog?.is_late
                    ? "text-orange-500"
                    : "text-indigo-400"
                }
              />

            </div>

          </div>

          {/* RIGHT */}
          <aside className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 border rounded-[2.5rem] p-8 sticky top-12 shadow-sm">

              <h2 className="text-[10px] font-black tracking-[0.3em] text-indigo-500 mb-8 flex justify-between items-center uppercase">
                Registry Logs
                <ShieldCheck size={16} />
              </h2>

              <div className="space-y-6">

                <DetailRow
                  label="System Check-In"
                  value={formatToISTFull(todayLog?.check_in_time)}
                />

                <DetailRow
                  label="System Check-Out"
                  value={formatToISTFull(todayLog?.check_out_time)}
                />

                <DetailRow
                  label="Accrued Overtime"
                  value={`${todayLog?.overtime || '0.00'} HRS`}
                />

              </div>

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