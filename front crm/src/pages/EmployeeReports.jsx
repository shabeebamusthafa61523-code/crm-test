import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, User, ChevronRight, Search, FileText, Calendar, Clock, Loader2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL;

const DESIGNATION_REPORT_MAP = {
  '6a1e8e2d01a0dae8b2f3b18c': { name: 'Developer Report', path: '/developer-report', supportWeekly: false },
  '6a2f9e086f1c41b0c80a9e21': { name: 'HOD R&D Report', path: '/hod-rd-report', supportWeekly: false },
  '6a1e8e6e01a0dae8b2f3b18d': { name: 'Graphic Designer Report', path: '/graphic-designer-report', supportWeekly: false },
  '6a27939af292348deb7d0495': { name: 'Academic Counselor Report', path: '/academic-counselor-report', supportWeekly: false },
  '6a2f912c2df21dc234018caa': { name: 'Videographer Report', path: '/videographer-report', supportWeekly: false },
  '6a2f8efea2fe388770a38987': { name: 'HR Shift Report', path: '/hr-report', supportWeekly: false },
  '6a2f91472df21dc234018cab': { name: 'Ops Shift Report', path: '/ops-report', supportWeekly: true },
  '6a2f915e2df21dc234018cac': { name: 'Accountant Shift Report', path: '/accountant-report', supportWeekly: false },
  '6a2f909d2df21dc234018ca8': { name: 'Marketing Shift Report', path: '/marketing-report', supportWeekly: false }
};

// Fallback reports array for manual selection
const ALL_REPORT_TYPES = [
  { label: 'Developer', path: '/developer-report', supportWeekly: false },
  { label: 'HOD R&D', path: '/hod-rd-report', supportWeekly: false },
  { label: 'Graphic Designer', path: '/graphic-designer-report', supportWeekly: false },
  { label: 'Academic Counselor', path: '/academic-counselor-report', supportWeekly: false },
  { label: 'Videographer', path: '/videographer-report', supportWeekly: false },
  { label: 'HR Shift', path: '/hr-report', supportWeekly: false },
  { label: 'Ops Shift', path: '/ops-report', supportWeekly: true },
  { label: 'Accountant Shift', path: '/accountant-report', supportWeekly: false },
  { label: 'Marketing Shift', path: '/marketing-report', supportWeekly: false }
];

const EmployeeReports = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/user/list`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setEmployees(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load employee list:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [getAuthHeaders]);

  const filteredEmployees = employees.filter(emp => {
    const nameMatch = (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  const getReportConfig = (emp) => {
    const desigId = emp.designationId?._id || emp.designationId || emp.designation_id;
    return DESIGNATION_REPORT_MAP[desigId] || null;
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/70 dark:text-indigo-400/80">Admin Directory</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
            Employee <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Reports</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            View daily shift reports, weekly records, and monthly consolidations for each employee.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 shrink-0">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-all shadow-sm"
          />
          <Search size={18} className="absolute left-4 top-4 text-slate-400 pointer-events-none" />
        </div>
      </header>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={36} />
          <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Retrieving employee roster...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 p-8 shadow-sm">
          <Users size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Employees Found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search query or verify the employee list.</p>
        </div>
      ) : (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => {
            const reportConfig = getReportConfig(emp);
            const initial = emp.name ? emp.name.charAt(0).toUpperCase() : '?';

            return (
              <motion.div
                key={emp._id || emp.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Profile Section */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-lg font-bold shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                      {emp.name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{emp.email}</p>
                    <p className="text-[10px] font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-wider mt-2 bg-indigo-50/50 dark:bg-lime-950/20 px-2.5 py-0.5 rounded-full inline-block">
                      {emp.designationId?.name || emp.role || 'Staff Member'}
                    </p>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  {reportConfig ? (
                    <>
                      {/* Daily Link */}
                      <Link
                        to={`${reportConfig.path}?userId=${emp._id || emp.id}`}
                        className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950/50 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-bold transition-all border border-slate-100 dark:border-slate-900/60"
                      >
                        <span className="flex items-center gap-2">
                          <FileText size={14} /> Daily Shift Report
                        </span>
                        <ChevronRight size={14} className="opacity-50" />
                      </Link>

                      {/* Weekly Link */}
                      {reportConfig.supportWeekly && (
                        <Link
                          to={`${reportConfig.path}?userId=${emp._id || emp.id}&generateWeekly=true`}
                          className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950/50 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-bold transition-all border border-slate-100 dark:border-slate-900/60"
                        >
                          <span className="flex items-center gap-2">
                            <Clock size={14} /> Weekly Consolidated
                          </span>
                          <ChevronRight size={14} className="opacity-50" />
                        </Link>
                      )}

                      {/* Monthly Link */}
                      <Link
                        to={`${reportConfig.path}?userId=${emp._id || emp.id}&generateMonthly=true`}
                        className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950/50 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-bold transition-all border border-slate-100 dark:border-slate-900/60"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar size={14} /> Monthly Consolidated
                        </span>
                        <ChevronRight size={14} className="opacity-50" />
                      </Link>
                    </>
                  ) : (
                    /* Dropdown mapping for unknown designation */
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 italic">No report template auto-mapped. Choose manually:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_REPORT_TYPES.map((rep) => (
                          <Link
                            key={rep.path}
                            to={`${rep.path}?userId=${emp._id || emp.id}`}
                            className="px-2.5 py-2 text-center bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950/40 dark:hover:bg-indigo-950/20 text-[10px] font-bold rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-100 dark:border-slate-900/40 transition-all truncate"
                            title={rep.label}
                          >
                            {rep.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeReports;
