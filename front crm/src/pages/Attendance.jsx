import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, LogIn, LogOut, History, ShieldCheck, Timer, Loader2, Activity, AlertTriangle, CheckCircle2, Fingerprint } from 'lucide-react';

const API_BASE = "/api";

const Attendance = () => {
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const parseAsUTC = (dateInput) => {
    if (!dateInput) return null;
    return new Date(dateInput.endsWith('Z') ? dateInput : dateInput + 'Z');
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const formatToISTFull = (dateInput) => {
    if (!dateInput) return '---';
    try {
      return parseAsUTC(dateInput).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toUpperCase();
    } catch { return '---'; }
  };

  const formatTime = (dateInput) => {
    if (!dateInput) return '---';
    return parseAsUTC(dateInput).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Memoized live working hours calculation
  const liveWorkingHours = useMemo(() => {
    if (!todayLog?.check_in_time || todayLog?.check_out_time) {
        return calculateWorkingHours(todayLog?.check_in_time, todayLog?.check_out_time);
    }
    const start = parseAsUTC(todayLog.check_in_time);
    const diffMs = currentTime - start;
    return Math.max(0, diffMs / 3600000).toFixed(2);
  }, [todayLog, currentTime]);

  function calculateWorkingHours(checkIn, checkOut) {
    if (!checkIn) return "0.00";
    const start = parseAsUTC(checkIn);
    const end = checkOut ? parseAsUTC(checkOut) : new Date();
    return Math.max(0, (end - start) / 3600000).toFixed(2);
  }

  const getHeaders = () => {
    const rawToken = localStorage.getItem('token');
    const token = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchStatus = useCallback(async () => {
    try {
      const todayStr = getTodayStr();
      const response = await fetch(`${API_BASE}/attendance/${todayStr}`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        const rawId = localStorage.getItem('user_id');
        const myId = rawId ? rawId.replace(/"/g, '').trim().toLowerCase() : null;
        let recordsArray = Array.isArray(data) ? data : Object.values(data);
        const myRecord = recordsArray.find(r => String(r?.user_id || '').trim().toLowerCase() === myId);
        setTodayLog(myRecord || null);
      }
    } catch {
      setError("System Sync Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const handleAction = async (type) => {
    setError(null);
    setSuccessMsg(null);
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/attendance/${type}`, {
        method: 'POST',
        headers: getHeaders()
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Action denied");
      setSuccessMsg(`${type.replace('-', ' ')} successful!`);
      await fetchStatus();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c10] flex items-center justify-center transition-colors duration-500">
      <div className="relative">
        <Loader2 className="text-indigo-500 animate-spin" size={48} />
        <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse"></div>
      </div>
    </div>
  );

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
              STAFF.<span className="text-indigo-500 transition-all duration-500 hover:text-indigo-400 hover:drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-default">LOG</span>
            </motion.h2>
            <div className="flex items-center gap-2 mt-4">
              <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${todayLog?.check_in_time && !todayLog?.check_out_time ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                Network Status: 
                <span className={todayLog?.check_in_time && !todayLog?.check_out_time ? "text-emerald-400" : "text-red-500"}>
                  {todayLog?.check_in_time && !todayLog?.check_out_time ? ' SECURE_ONLINE' : ' TERMINATED'}
                </span>
              </p>
            </div>
          </div>

          <div className="hidden md:block bg-white/70 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 text-sm shadow-sm">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8">
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-widest">
                <AlertTriangle size={14} className="animate-bounce" /> {error}
              </div>
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 size={14} /> {successMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">

            {/* MAIN DISPLAY */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-12 lg:p-24 flex flex-col items-center overflow-hidden shadow-xl">
                    {/* Background Decorative Element */}
                    <Fingerprint className="absolute -bottom-10 -right-10 text-slate-100 dark:text-slate-950/20 w-64 h-64 -rotate-12" />
                    
                    <div className="flex items-baseline gap-4 mb-4">
                        <div className="text-8xl lg:text-[10rem] font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none select-none">
                            {currentTime.getHours().toString().padStart(2, '0')}
                            <span className="animate-pulse text-indigo-500">:</span>
                            {currentTime.getMinutes().toString().padStart(2, '0')}
                        </div>
                        <div className="text-2xl lg:text-4xl font-mono text-indigo-500/50 font-bold w-12">
                            {currentTime.getSeconds().toString().padStart(2, '0')}
                        </div>
                    </div>

                    <p className="text-[10px] tracking-[0.5em] text-slate-600 dark:text-slate-400 font-black uppercase mb-12">Universal Time Protocol</p>

                    <div className="grid grid-cols-2 gap-6 w-full max-w-md relative z-10">
                        <motion.button 
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            disabled={actionLoading || (todayLog?.check_in_time && !todayLog?.check_out_time)}
                            onClick={() => handleAction('check-in')} 
                            className="group/btn bg-indigo-600 disabled:opacity-30 hover:bg-indigo-500 p-6 rounded-3xl text-white font-bold flex flex-col items-center gap-3 transition-all shadow-xl shadow-indigo-500/10 cursor-pointer"
                        >
                            <LogIn size={24} className="group-hover/btn:-translate-y-1 transition-transform" /> 
                            <span className="text-xs uppercase tracking-widest">Initialize</span>
                        </motion.button>
                        
                        <motion.button 
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            disabled={actionLoading || !todayLog?.check_in_time || todayLog?.check_out_time}
                            onClick={() => handleAction('check-out')} 
                            className="group/btn bg-slate-200 dark:bg-slate-800 hover:bg-red-600 dark:hover:bg-red-600 hover:text-white dark:hover:text-white disabled:opacity-30 p-6 rounded-3xl text-slate-700 dark:text-slate-300 font-bold flex flex-col items-center gap-3 transition-all shadow-sm cursor-pointer"
                        >
                            <LogOut size={24} className="group-hover/btn:translate-y-1 transition-transform" /> 
                            <span className="text-xs uppercase tracking-widest">Terminate</span>
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBlock label="Session Date" value={todayLog?.date || getTodayStr()} icon={History} color="text-slate-400" />
                <StatBlock label="In Time" value={formatTime(todayLog?.check_in_time)} icon={Clock} color="text-indigo-400" />
                <StatBlock label="Work Hours" value={`${liveWorkingHours}h`} icon={Timer} color="text-emerald-400" />
                <StatBlock 
                    label="Status" 
                    value={todayLog?.is_late ? "LATE_ENTRY" : "OPTIMAL"} 
                    icon={Activity} 
                    color={todayLog?.is_late ? "text-orange-500" : "text-indigo-400"} 
                />
            </div>
          </div>

          {/* SIDE PANEL */}
          <aside className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 sticky top-12 shadow-sm">
              <h2 className="text-[10px] font-black tracking-[0.3em] text-indigo-500 mb-8 flex justify-between items-center uppercase">
                Registry Logs <ShieldCheck size={16} className="text-indigo-500" />
              </h2>
              <div className="space-y-6">
                <DetailRow label="System Check-In" value={formatToISTFull(todayLog?.check_in_time)} />
                <DetailRow label="System Check-Out" value={formatToISTFull(todayLog?.check_out_time)} />
                <DetailRow label="Accrued Overtime" value={`${todayLog?.overtime || '0.00'} HRS`} />
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-2 font-bold tracking-widest uppercase">Encryption ID</p>
                    <p className="text-[10px] font-mono text-indigo-300/40 break-all bg-indigo-500/5 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-500/10 dark:border-indigo-500/20">
                        {todayLog?.id ? `LOG_AUTH_${todayLog.id}` : 'WAITING_FOR_HANDSHAKE'}
                    </p>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

const StatBlock = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] hover:border-indigo-500/30 dark:hover:border-indigo-500/50 hover:shadow-md transition-all group shadow-sm">
    <Icon size={18} className={`mb-4 ${color} group-hover:scale-110 transition-transform`} />
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">{label}</p>
    <p className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="group">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-indigo-400 transition-colors">{label}</p>
    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</p>
  </div>
);

export default Attendance;