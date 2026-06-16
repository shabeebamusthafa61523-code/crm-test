import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Target, 
  Zap, 
  ListChecks, 
  Timer, 
  Activity, 
  ChevronRight, 
  Loader2,
  Users,
  TrendingUp,
  Building,
  ListTodo,
  Shield,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Admin Dashboard States
  const [adminStats, setAdminStats] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [sourcePerformance, setSourcePerformance] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [followupMetrics, setFollowupMetrics] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  // Filters & Search
  const [userSearch, setUserSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");

  const navigate = useNavigate();

  const getISTDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata'
    }).format(new Date());
  };

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

  // Live Working Hours for Operator Dashboard
  const liveWorkingHours = useMemo(() => {
    if (!attendanceRecord?.check_in_time) return "0.00";

    if (attendanceRecord?.check_out_time) {
      const start = parseAsUTC(attendanceRecord.check_in_time);
      const end = parseAsUTC(attendanceRecord.check_out_time);
      return Math.max(0, (end - start) / 3600000).toFixed(2);
    }

    const start = parseAsUTC(attendanceRecord.check_in_time);
    const diffMs = currentTime.getTime() - start.getTime();
    return Math.max(0, diffMs / 3600000).toFixed(2);
  }, [attendanceRecord, currentTime]);

  const fetchData = useCallback(async (userId, privilegedMode) => {
    try {
      setLoading(true);
      const todayStr = getISTDate();

      if (privilegedMode) {
        // Fetch Admin specific stats in parallel
        const [taskRes, userRes, summaryRes, funnelRes, sourceRes, staffRes, followupRes] = await Promise.all([
          fetch(`${API_BASE}/tasks/all`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/users`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/summary`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/conversion-rate`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/source-performance`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/staff-performance`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/v1/analytics/followup-metrics`, { headers: getAuthHeaders() })
        ]);

        // TASKS
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          const rawTasks = Array.isArray(taskData) ? taskData : taskData?.data || [];
          setTasks(rawTasks);
        }

        // USERS
        if (userRes.ok) {
          const userData = await userRes.json();
          const rawUsers = userData.data && Array.isArray(userData.data)
            ? userData.data
            : (Array.isArray(userData) ? userData : []);
          setAllUsers(rawUsers);
        }

        // SUMMARY METRICS
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.success) {
            setAdminStats(summaryData.data);
          }
        }

        // FUNNEL
        if (funnelRes.ok) {
          const funnelData = await funnelRes.json();
          if (funnelData.success) {
            setFunnelData(funnelData.data);
          }
        }

        // SOURCE PERFORMANCE
        if (sourceRes.ok) {
          const sourceData = await sourceRes.json();
          if (sourceData.success) {
            setSourcePerformance(sourceData.data || []);
          }
        }

        // STAFF PERFORMANCE
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          if (staffData.success) {
            setStaffPerformance(staffData.data || []);
          }
        }

        // WEEKLY TIMELINE
        if (followupRes.ok) {
          const followupData = await followupRes.json();
          if (followupData.success) {
            setFollowupMetrics(followupData.data || null);
          }
        }

      } else {
        // Standard User fetching
        const [taskRes, attRes] = await Promise.all([
          fetch(`${API_BASE}/tasks/all`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/attendance/${todayStr}`, { headers: getAuthHeaders() })
        ]);

        if (taskRes.ok) {
          const taskData = await taskRes.json();
          const rawTasks = Array.isArray(taskData) ? taskData : taskData?.data || [];
          const cleanedTasks = rawTasks.map(task => ({
            ...task,
            assigned_to: (task.assigned_to && typeof task.assigned_to === "object")
              ? (task.assigned_to.id || task.assigned_to._id)
              : task.assigned_to
          }));
          setTasks(cleanedTasks);
        }

        if (attRes.ok) {
          const attData = await attRes.json();
          setAttendanceRecord(attData || null);
        }
      }

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const handleSync = () => {
    if (user?.user_id) {
      fetchData(user.user_id, isAdmin);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const storedUserId = localStorage.getItem("user_id")?.replace(/"/g, '');

    if (savedUser && storedUserId) {
      const parsedUser = JSON.parse(savedUser);
      parsedUser.user_id = storedUserId;
      setUser(parsedUser);

      // Check if user has administrative/privileged role
      const currentUserRole = String(parsedUser.role_id || parsedUser.roleId || parsedUser.role || '').toLowerCase().trim();
      const privileged = ['1', '2', 'hr', 'admin'].includes(currentUserRole);
      setIsAdmin(privileged);

      fetchData(storedUserId, privileged);
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Operator specific filtered tasks
  const myTasks = useMemo(() => {
    if (!user?.user_id) return [];

    return tasks.filter(t => {
      const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
        ? (t.assigned_to.id || t.assigned_to._id)
        : t.assigned_to;

      return String(assignedId).trim() === String(user.user_id).trim();
    });
  }, [tasks, user]);

  const operatorMetrics = useMemo(() => {
    const total = myTasks.length;
    const pending = myTasks.filter((t) => ["pending", "current"].includes(t.status?.toLowerCase())).length;
    const completed = myTasks.filter((t) => t.status?.toLowerCase() === "done").length;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, rate };
  }, [myTasks]);

  // Helper to find operator name for tasks
  const getOperatorName = (assignedTo) => {
    if (!assignedTo) return "Unassigned";
    if (typeof assignedTo === "object") {
      return assignedTo.name || assignedTo.email || "Unknown Operator";
    }
    const found = allUsers.find(u => String(u.id || u._id) === String(assignedTo));
    return found ? found.name : `Operator ID: ${String(assignedTo).slice(0, 8)}`;
  };

  // Filtered operators list
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const search = userSearch.toLowerCase().trim();
      if (!search) return true;
      return (
        String(u.name || "").toLowerCase().includes(search) ||
        String(u.email || "").toLowerCase().includes(search) ||
        String(u.department || "").toLowerCase().includes(search) ||
        String(u.role || "").toLowerCase().includes(search)
      );
    });
  }, [allUsers, userSearch]);

  // Filtered administrative tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const search = taskSearch.toLowerCase().trim();
      const statusMatch = taskFilter === "all" || String(t.status || "").toLowerCase() === taskFilter.toLowerCase();
      
      const searchMatch = !search || 
        String(t.title || "").toLowerCase().includes(search) ||
        getOperatorName(t.assigned_to).toLowerCase().includes(search);

      return statusMatch && searchMatch;
    });
  }, [tasks, taskSearch, taskFilter, allUsers]);

  // ----------------------------------------------------
  // SVG LINE/AREA CHART GENERATOR (Real Activity Timeline)
  // ----------------------------------------------------
  const renderWeeklyActivityChart = () => {
    const dataPoints = followupMetrics?.weeklyTimeline || [];

    if (dataPoints.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Activity className="text-slate-350 dark:text-slate-650 mb-2" size={24} />
          <p className="text-[10px] font-bold text-slate-550 dark:text-slate-450 uppercase tracking-widest">No Activity Logged This Week</p>
        </div>
      );
    }

    const maxVal = Math.max(...dataPoints.map(d => d.count), 10);
    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = dataPoints.map((d, i) => {
      const x = paddingLeft + (i / (dataPoints.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
      const label = d.date.includes('-') ? d.date.split('-')[2] : d.date;
      return { x, y, label, count: d.count };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaD = points.length 
      ? `${pathD} L ${points[points.length-1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z` 
      : "";

    return (
      <div className="w-full h-full flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Operator Action Log
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Lead follow-ups registered last 7 days
            </p>
          </div>
          <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded uppercase">
            Live Feed
          </span>
        </div>

        <div className="relative flex-1 min-h-[140px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.33, 0.66, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * ratio;
              const val = Math.round(maxVal * (1 - ratio));
              return (
                <g key={i} className="opacity-15 dark:opacity-[0.07]">
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-slate-400" />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-bold text-slate-550 fill-current">{val}</text>
                </g>
              );
            })}

            {/* Area gradient under path */}
            {areaD && <path d={areaD} fill="url(#areaGrad)" />}

            {/* Solid line path */}
            {pathD && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                className="drop-shadow-[0_2px_6px_rgba(99,102,241,0.35)]" 
              />
            )}

            {/* Data point anchors */}
            {points.map((p, i) => (
              <g key={i} className="group/anchor">
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="4" 
                  fill="#6366f1" 
                  stroke="#fff" 
                  strokeWidth="1.5" 
                  className="cursor-pointer transition-all duration-300 group-hover/anchor:r-5 group-hover/anchor:fill-lime-400" 
                />
                
                {/* Micro-tooltip */}
                <g className="opacity-0 group-hover/anchor:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect x={p.x - 16} y={p.y - 25} width="32" height="16" rx="4" fill="#0f172a" className="dark:fill-slate-800 shadow-md" />
                  <text x={p.x} y={p.y - 14} textAnchor="middle" fill="#fff" className="text-[9px] font-black fill-white">{p.count}</text>
                </g>

                {/* X Axis Date labels */}
                <text x={p.x} y={height - 5} textAnchor="middle" className="text-[9px] font-bold text-slate-500 fill-current">{p.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // RENDER ADMIN VIEW
  // ----------------------------------------------------
  const renderAdminView = () => {
    const activeStaffCount = allUsers.filter(u => u.isActive !== false).length;
    const doneTasksCount = tasks.filter(t => String(t.status).toLowerCase() === "done").length;
    const totalTasksCount = tasks.length;
    const taskCompletionRate = totalTasksCount ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

    const stats = adminStats || {};
    const funnelList = funnelData?.funnel || [];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-24 pt-4 max-w-7xl mx-auto px-4">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-indigo-500" />
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">
                System Control Console
              </p>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
              Admin <span className="text-indigo-650 dark:text-indigo-400">Dashboard</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw size={14} />
              <span>Sync System</span>
            </button>
            <div className="px-5 py-3 bg-indigo-600/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {currentTime.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
            </div>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          <StatCard
            label="Leads Pipeline"
            value={stats.totalLeads?.value || 0}
            icon={TrendingUp}
            color="text-indigo-600 dark:text-indigo-400"
            borderColor="bg-indigo-600 dark:bg-indigo-500"
            bgColor="bg-indigo-50 dark:bg-indigo-950/20"
            trend={stats.totalLeads?.trend}
            subtext="Total Registered Leads"
          />
          <StatCard
            label="Admission Ok"
            value={stats.admissionsConfirmed?.value || 0}
            icon={CheckCircle}
            color="text-teal-600 dark:text-teal-400"
            borderColor="bg-teal-500"
            bgColor="bg-teal-50 dark:bg-teal-950/20"
            subtext="Ok to Take Admission"
          />
          <StatCard
            label="Conversion Rate"
            value={`${stats.convertedLeads?.rate || 0}%`}
            icon={Activity}
            color="text-emerald-600 dark:text-emerald-400"
            borderColor="bg-emerald-500"
            bgColor="bg-emerald-50 dark:bg-emerald-950/20"
            subtext={`${stats.convertedLeads?.value || 0} Converted Leads`}
          />
          <StatCard
            label="Active Staff"
            value={activeStaffCount}
            icon={Users}
            color="text-lime-600 dark:text-lime-400"
            borderColor="bg-lime-500"
            bgColor="bg-lime-50 dark:bg-lime-950/20"
            subtext={`${allUsers.length} Operators Enrolled`}
          />
          <StatCard
            label="Tasks Completed"
            value={`${taskCompletionRate}%`}
            icon={ListChecks}
            color="text-amber-600 dark:text-amber-400"
            borderColor="bg-amber-500"
            bgColor="bg-amber-50 dark:bg-amber-950/20"
            subtext={`${doneTasksCount}/${totalTasksCount} Missions Closed`}
          />
        </div>

        {/* CHARTS SECTION 1 - SVG TIMELINE & LEAD STAGE FUNNEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* WEEKLY ACTIVITY SVG CHART */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col justify-between">
            {renderWeeklyActivityChart()}
          </div>

          {/* LEAD PIPELINE FUNNEL CHART */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Leads Funnel
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  Lead stage distribution summary
                </p>
              </div>
              <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-0.5 rounded">
                Funnel Stages
              </span>
            </div>

            {funnelList && funnelList.length > 0 ? (
              <div className="space-y-4">
                {funnelList.map((item, index) => {
                  const colors = {
                    'New': 'from-blue-500 to-indigo-500 bg-blue-500',
                    'Contacted': 'from-indigo-500 to-violet-500 bg-indigo-500',
                    'Follow Up': 'from-violet-500 to-purple-500 bg-violet-500',
                    'Interested': 'from-amber-500 to-orange-500 bg-amber-500',
                    'Converted': 'from-emerald-500 to-lime-500 bg-emerald-500',
                    'Lost': 'from-rose-500 to-red-500 bg-rose-500'
                  };
                  const barColor = colors[item.stage] || 'from-slate-400 to-slate-500 bg-slate-400';

                  return (
                    <div key={item.stage} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-350">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {item.stage}
                        </span>
                        <span>{item.count} ({item.percentage}%)</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.05 }}
                          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40 h-full">
                <BarChart2 className="mx-auto text-slate-350 dark:text-slate-650 mb-2" size={24} />
                <p className="text-[10px] font-bold text-slate-550 dark:text-slate-450 uppercase tracking-widest">
                  No Funnel Data Registered
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CHARTS SECTION 2 - LEAD SOURCES & OPERATOR CONVERSION LEADERBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEAD SOURCE ATTRIBUTION */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Lead Sources Attribution
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  Marketing channels comparison metrics
                </p>
              </div>
              <span className="text-[9px] font-black text-lime-500 bg-lime-500/5 px-2 py-0.5 border border-lime-500/10 rounded uppercase">
                Channels
              </span>
            </div>

            {sourcePerformance && sourcePerformance.length > 0 ? (
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {sourcePerformance.slice(0, 5).map((src, i) => {
                  const totalLeadsCount = Math.max(...sourcePerformance.map(s => s.totalLeads), 1);
                  const widthPercent = Math.round((src.totalLeads / totalLeadsCount) * 100);

                  return (
                    <div key={src.source || i} className="space-y-1">
                      <div className="flex justify-between items-baseline text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="uppercase text-[10px] tracking-wide">{src.source || "Unknown Source"}</span>
                        <div className="flex gap-3 text-slate-500 dark:text-slate-400">
                          <span>{src.totalLeads} Leads</span>
                          <span className="text-indigo-500 font-black">{src.conversionRate}% Conv.</span>
                        </div>
                      </div>

                      <div className="relative h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPercent}%` }}
                          transition={{ duration: 0.8, delay: i * 0.06 }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-650"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40 h-full">
                <TrendingUp className="mx-auto text-slate-350 dark:text-slate-650 mb-2" size={24} />
                <p className="text-[10px] font-bold text-slate-550 dark:text-slate-450 uppercase tracking-widest">
                  No Lead Sources Registered
                </p>
              </div>
            )}
          </div>

          {/* STAFF LEADERBOARD (CONVERSION RATE) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Operator Performance Leaderboard
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  Lead conversion ranking across operator staff
                </p>
              </div>
              <span className="text-[9px] font-black text-amber-500 bg-amber-500/5 px-2 py-0.5 border border-amber-500/10 rounded uppercase">
                Ranking
              </span>
            </div>

            {staffPerformance && staffPerformance.length > 0 ? (
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {staffPerformance.slice(0, 4).map((staff, i) => {
                  const rate = staff.conversionRate ? Math.round(staff.conversionRate) : 0;
                  
                  return (
                    <div key={staff.name || i} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-150 dark:border-slate-855 bg-slate-50 dark:bg-slate-950 shrink-0 flex items-center justify-center font-bold text-xs text-indigo-500">
                        {String(staff.name || "?").charAt(0)}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-baseline text-[11px] font-bold text-slate-700 dark:text-slate-350">
                          <span className="truncate max-w-[150px]">{staff.name}</span>
                          <div className="flex gap-2.5 text-slate-450 font-medium">
                            <span>{staff.totalAssigned} Assigned</span>
                            <span className="text-emerald-500 font-black">{rate}% Conv.</span>
                          </div>
                        </div>

                        <div className="h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rate}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40 h-full">
                <Users className="mx-auto text-slate-350 dark:text-slate-655 mb-2" size={24} />
                <p className="text-[10px] font-bold text-slate-550 dark:text-slate-455 uppercase tracking-widest">
                  No Operator Performance Registered
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION - QUICK ACTIONS & OPERATORS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* QUICK ADMINISTRATIVE ACTIONS */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
            <h2 className="text-xs font-black text-slate-800 dark:text-slate-255 uppercase tracking-wider mb-6">
              Console Navigation
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <ActionCard
                title="Users Hub"
                desc="Enrolled staff list"
                icon={Users}
                onClick={() => navigate("/users")}
              />
              <ActionCard
                title="Leads Hub"
                desc="Directories index"
                icon={TrendingUp}
                onClick={() => navigate("/leads")}
              />
              <ActionCard
                title="Departments"
                desc="Corporate hierarchy"
                icon={Building}
                onClick={() => navigate("/departments")}
              />
              <ActionCard
                title="Tasks Console"
                desc="Operator mission logs"
                icon={ListTodo}
                onClick={() => navigate("/todo")}
              />
            </div>
            
            <button
              onClick={() => navigate("/attendance")}
              className="mt-4 flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-500 rounded-xl">
                  <Timer size={16} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-355">Attendance Portal</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-tight mt-0.5">Operator check-in roster logs</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* ACTIVE STAFF ROSTER */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  CRM Operator Roster
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                  Enrolled employee directory list
                </p>
              </div>

              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-855 dark:text-slate-255 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto scrollbar-thin">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
                  <p className="text-[9px] font-bold text-slate-455 uppercase tracking-widest">
                    No operators match your query
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                      <th className="pb-3 pr-4">Staff Operator</th>
                      <th className="pb-3 pr-4">Role / Dept</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 4).map((u) => (
                      <tr key={u.id || u._id} className="border-b border-slate-50 dark:border-slate-800/30 last:border-none group">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0">
                              <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=6366f1&color=fff`}
                                className="w-full h-full object-cover"
                                alt="staff avatar"
                              />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-255 group-hover:text-indigo-500 transition-colors">
                                {u.name}
                              </h4>
                              <p className="text-[9px] text-slate-555 dark:text-slate-455 leading-tight">{u.email}</p>
                              {u.phone && (
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">{u.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-[9px] font-black text-slate-700 dark:text-slate-355 uppercase tracking-tight block">
                            {u.role || "Operator"}
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-455 uppercase font-medium block">
                            {u.department || "No Department"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase ${
                            u.isActive !== false
                              ? "text-emerald-500 bg-emerald-500/5 border border-emerald-500/10"
                              : "text-rose-500 bg-rose-500/5 border border-rose-500/10"
                          }`}>
                            {u.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {filteredUsers.length > 4 && (
              <button
                onClick={() => navigate("/users")}
                className="mt-4 text-center w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-all"
              >
                View Full Operators Directory ({allUsers.length})
              </button>
            )}
          </div>
        </div>

        {/* TASKS SYSTEM MONITOR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight">
                System Task Monitor
              </h2>
              <p className="text-xs text-slate-550 dark:text-slate-450 font-medium">
                Track assigned missions and operational workloads
              </p>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-60">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  // placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-850 dark:text-slate-250 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex bg-slate-500 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                {["all", "pending", "done"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
  taskFilter === filter
    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
                <ListTodo className="mx-auto text-slate-350 dark:text-slate-750 mb-2" size={28} />
                <p className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                  No system tasks registered for current filters
                </p>
              </div>
            ) : (
              filteredTasks.slice(0, 5).map((task) => {
                const isDone = String(task.status).toLowerCase() === "done";
                return (
                  <div
                    key={task.id || task._id}
                    className="p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 p-2 rounded-xl shrink-0 border ${
                        isDone 
                          ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" 
                          : "bg-amber-500/5 text-amber-500 border-amber-500/10"
                      }`}>
                        {isDone ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 dark:text-slate-250 leading-tight">
                          {task.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-550">
                          <span>Assigned To: <span className="text-indigo-500 dark:text-indigo-400 font-black">{getOperatorName(task.assigned_to)}</span></span>
                          <span className="hidden sm:inline">•</span>
                          <span>ID: {String(task.id || task._id || "").slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-tight ${
                        isDone
                          ? "text-emerald-500 bg-emerald-500/5 border border-emerald-500/10"
                          : "text-amber-500 bg-amber-500/5 border border-amber-500/10"
                      }`}>
                        {task.status || "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filteredTasks.length > 5 && (
            <button
              onClick={() => navigate("/todo")}
              className="mt-4 text-center w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-all"
            >
              Configure and Manage System Tasks ({tasks.length})
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // ----------------------------------------------------
  // RENDER OPERATOR VIEW
  // ----------------------------------------------------
  const renderOperatorView = () => {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20 pt-6 max-w-7xl mx-auto px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Operator Profile</p>
              <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">{user?.name}</h1>
            </div>
          </div>

          {/* Shift start block */}
          <div
            onClick={() => navigate("/attendance")}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 hover:border-indigo-500/30 dark:hover:border-indigo-500/50 transition-all shadow-sm"
          >
            <div className="p-3 bg-white-500/10 dark:bg-indigo-100/20 rounded-xl text-indigo-500 dark:text-indigo-400"><Timer size={20} /></div>
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
          <StatCard label="Success Rate" value={`${operatorMetrics.rate}%`} icon={Activity} color="text-indigo-600 dark:text-indigo-400" borderColor="bg-indigo-600" bgColor="bg-indigo-50 dark:bg-indigo-950/20" />
          <StatCard label="Live Work Hours" value={`${liveWorkingHours}h`} icon={Clock} color="text-lime-600 dark:text-lime-400" borderColor="bg-lime-500" bgColor="bg-lime-50 dark:bg-lime-950/20" />
          <StatCard label="Pending Tasks" value={operatorMetrics.pending} icon={Target} color="text-amber-600 dark:text-amber-400" borderColor="bg-amber-500" bgColor="bg-amber-50 dark:bg-amber-950/20" />
          <StatCard label="Completed" value={operatorMetrics.completed} icon={ListChecks} color="text-indigo-600 dark:text-indigo-400" borderColor="bg-indigo-500" bgColor="bg-indigo-50 dark:bg-indigo-950/20" />
        </div>

        {/* MISSIONS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight">
                Personal <span className="text-indigo-500">Missions</span>
              </h2>
            </div>

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
                        <p className="text-[9px] text-slate-555 dark:text-slate-450 font-bold uppercase tracking-tighter mt-0.5">ID: {task.id.slice(0, 8)}</p>
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

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c10] flex items-center justify-center transition-colors duration-500">
      <Loader2 className="text-indigo-500 animate-spin" size={40} />
    </div>
  );

  return isAdmin ? renderAdminView() : renderOperatorView();
};

const StatCard = ({ label, value, icon: Icon, color, borderColor, bgColor, trend, subtext }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/50 p-6 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all hover:border-slate-350 dark:hover:border-slate-700">
    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${borderColor}`} />

    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-555 dark:text-slate-455 uppercase tracking-[0.15em] mb-1">{label}</p>
        <h3 className={`text-3xl font-black italic tracking-tight ${color}`}>{value}</h3>
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`flex items-center text-[9px] font-black px-1.5 py-0.5 rounded ${
              trend >= 0 
                ? "text-emerald-500 bg-emerald-500/5 border border-emerald-500/10" 
                : "text-rose-500 bg-rose-500/5 border border-rose-500/10"
            }`}>
              {trend >= 0 ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
              {Math.abs(trend)}%
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">VS 24H AGO</span>
          </div>
        )}
        {subtext && (
          <p className="text-[9px] text-slate-400 dark:text-slate-450 font-bold uppercase tracking-wide">
            {subtext}
          </p>
        )}
      </div>
      <div className={`p-3.5 rounded-2xl ${bgColor} ${color} border border-slate-100 dark:border-slate-800/60 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const ActionCard = ({ title, desc, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="group p-5 bg-slate-50/50 hover:bg-white dark:bg-slate-950/20 dark:hover:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl flex flex-col text-left transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full group-hover:bg-indigo-500/10 transition-all" />
    <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
      <Icon size={18} />
    </div>
    <div className="flex items-center gap-1">
      <h3 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-tight group-hover:text-indigo-500 transition-colors">
        {title}
      </h3>
      <ArrowUpRight size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
    </div>
    <p className="text-[9px] text-slate-550 dark:text-slate-455 font-medium uppercase mt-0.5 leading-tight">
      {desc}
    </p>
  </button>
);

export default Dashboard;