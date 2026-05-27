import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Target, Zap, ListChecks, Timer, Activity, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
const getAuthHeaders = useCallback(() => {
  const rawToken = localStorage.getItem("token");
  const cleanToken = rawToken ? rawToken.replace(/"/g, "") : "";

  return {
    Authorization: cleanToken.startsWith("Bearer ")
      ? cleanToken
      : `Bearer ${cleanToken}`,
    accept: "application/json"
  };
}, []);
  // Helper to match Attendance Component's UTC parsing
  const parseAsUTC = (dateInput) => {
  if (!dateInput) return null;

  try {
    return new Date(
      dateInput.endsWith("Z")
        ? dateInput
        : `${dateInput}Z`
    );
  } catch {
    return null;
  }
};
  // Integrated Working Hours Calculation (Matches Attendance Component)
  const liveWorkingHours = useMemo(() => {
    if (!attendanceRecord?.check_in_time) return "0.00";

    // If already checked out, show fixed hours
    if (attendanceRecord?.check_out_time) {
      const start = parseAsUTC(attendanceRecord.check_in_time);
      const end = parseAsUTC(attendanceRecord.check_out_time);
      return Math.max(0, (end - start) / 3600000).toFixed(2);
    }

    // If still checked in, show live ticking hours
    const start = parseAsUTC(attendanceRecord.check_in_time);
const diffMs = currentTime.getTime() - start.getTime();
    return Math.max(0, diffMs / 3600000).toFixed(2);
  }, [attendanceRecord, currentTime]);

  const fetchData = useCallback(async (userId) => {
  try {
    setLoading(true);

    const todayStr = new Date().toISOString().split("T")[0];

    const [taskRes, attRes] = await Promise.all([
      fetch("http://localhost:5000/api/tasks/all", {
        headers: getAuthHeaders()
      }),

      fetch(`http://localhost:5000/api/attendance/${todayStr}`, {
        headers: getAuthHeaders()
      })
    ]);

    // TASKS
    if (taskRes.ok) {
      const taskData = await taskRes.json();

      const rawTasks = Array.isArray(taskData)
        ? taskData
        : taskData?.data || [];

      const cleanedTasks = rawTasks.map(task => ({
        ...task,
        assigned_to:
          typeof task.assigned_to === "object"
            ? (task.assigned_to.id || task.assigned_to._id)
            : task.assigned_to
      }));

      setTasks(cleanedTasks);
    }

    // ATTENDANCE
    if (attRes.ok) {
      const attData = await attRes.json();

      const records = Array.isArray(attData)
        ? attData
        : Object.values(attData || {});

      const myId = String(userId).trim();

      const myRecord = records.find(
        r => String(r?.user_id).trim() === myId
      );

      console.log("ATTENDANCE RECORD =", myRecord);

      setAttendanceRecord(myRecord || null);
    }

  } catch (err) {
    console.error("Dashboard Fetch Error:", err);
  } finally {
    setLoading(false);
  }
}, [getAuthHeaders]);
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const storedUserId = localStorage.getItem("user_id")?.replace(/"/g, '');

    if (savedUser && storedUserId) {
      const parsedUser = JSON.parse(savedUser);
      parsedUser.user_id = storedUserId;
      setUser(parsedUser);
      fetchData(storedUserId);
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const myTasks = useMemo(() => {
  if (!user?.user_id) return [];

  return tasks.filter(t => {

    const assignedId =
      typeof t.assigned_to === "object"
        ? (t.assigned_to.id || t.assigned_to._id)
        : t.assigned_to;

    return String(assignedId).trim() === String(user.user_id).trim();
  });

}, [tasks, user]);
  const metrics = useMemo(() => {
    const total = myTasks.length;
    const pending = myTasks.filter((t) => ["pending", "current"].includes(t.status?.toLowerCase())).length;
    const completed = myTasks.filter((t) => t.status?.toLowerCase() === "done").length;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, rate };
  }, [myTasks]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c10] flex items-center justify-center transition-colors duration-500">
      <Loader2 className="text-indigo-500 animate-spin" size={40} />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20 pt-6 max-w-7xl mx-auto px-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full" />
            {/* <img 
              src={user?.profile_image || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`} 
              className="w-16 h-16 rounded-2xl border border-slate-200 relative z-10" 
              alt="avatar" 
            /> */}
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Operator Profile</p>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">{user?.name}</h1>
          </div>
        </div>

        {/* Replace your current shift start block with this */}
        <div
          onClick={() => navigate("/attendance")}
          className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 hover:border-indigo-500/30 dark:hover:border-indigo-500/50 transition-all shadow-sm"
        >
          <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl text-indigo-500 dark:text-indigo-400"><Timer size={20} /></div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Shift Start</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase">
              {attendanceRecord?.check_in_time
                ? parseAsUTC(attendanceRecord.check_in_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })
                : 'OFFLINE'}
            </p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Success Rate" value={`${metrics.rate}%`} icon={Activity} color="text-indigo-600" borderColor="bg-indigo-600" bgColor="bg-indigo-50" />
        <StatCard label="Live Work Hours" value={`${liveWorkingHours}h`} icon={Clock} color="text-lime-600" borderColor="bg-lime-500" bgColor="bg-lime-50" />
        <StatCard label="Pending Tasks" value={metrics.pending} icon={Target} color="text-amber-600" borderColor="bg-amber-500" bgColor="bg-amber-50" />
        <StatCard label="Completed" value={metrics.completed} icon={ListChecks} color="text-indigo-600" borderColor="bg-indigo-500" bgColor="bg-indigo-50" />
      </div>

      {/* MISSIONS */}
      {/* MISSIONS SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight">
              Personal <span className="text-indigo-500">Missions</span>
            </h2>
          </div>

          {/* Explicit Full Board Button */}
          <button
            onClick={() => navigate("/todo")}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
          >
            Full Board <ChevronRight size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {myTasks.filter(t => t.status === 'pending').length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                No pending tasks found for operator
              </p>
            </div>
          ) : (
            myTasks
              .filter(t => t.status === 'pending')
              .slice(0, 5)
              .map((task) => (
                <div
                  key={task.id}
                  className="group p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl flex items-center justify-between hover:border-indigo-500/20 dark:hover:border-indigo-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-1 h-6 bg-indigo-500/40 rounded-full" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{task.title}</h4>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter mt-0.5">ID: {task.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black text-orange-500 bg-orange-500/5 border border-orange-500/10 px-3 py-1 rounded-lg uppercase tracking-tighter">
                      Pending
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, borderColor, bgColor }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/50 p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700">
    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${borderColor}`} />

    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
        <h3 className={`text-3xl font-black italic tracking-tight ${color}`}>{value}</h3>
      </div>
      <div className={`p-3.5 rounded-2xl ${bgColor} dark:bg-indigo-950/20 ${color} border border-slate-100 dark:border-slate-800 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

export default Dashboard;