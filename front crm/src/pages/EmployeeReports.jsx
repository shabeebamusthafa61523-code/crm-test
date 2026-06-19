import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Download, Loader2, FileDown, AlertCircle, ChevronDown, ChevronUp,
  CalendarDays, CalendarRange, BarChart3
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

// Map designation IDs to API endpoint prefixes
const DESIGNATION_API_MAP = {
  '6a1e8e2d01a0dae8b2f3b18c': { name: 'Developer',            apiPrefix: 'developer-reports',           byDate: 'by-date' },
  '6a2f9e086f1c41b0c80a9e21': { name: 'HOD R&D',              apiPrefix: 'hod-rd-reports',              byDate: 'by-date' },
  '6a1e8e6e01a0dae8b2f3b18d': { name: 'Graphic Designer',     apiPrefix: 'graphic-designer-reports',    byDate: 'by-date' },
  '6a27939af292348deb7d0495': { name: 'Academic Counselor',   apiPrefix: 'academic-counselor-reports',  byDate: 'by-date' },
  '6a2f912c2df21dc234018caa': { name: 'Videographer',         apiPrefix: 'videographer-reports',        byDate: 'by-date' },
  '6a2f8efea2fe388770a38987': { name: 'HR',                   apiPrefix: 'hr-reports',                  byDate: 'by-date' },
  '6a2f91472df21dc234018cab': { name: 'Ops',                  apiPrefix: 'ops-reports',                 byDate: 'by-date' },
  '6a2f915e2df21dc234018cac': { name: 'Accountant',           apiPrefix: 'accountant-reports',          byDate: 'by-date' },
  '6a2f909d2df21dc234018ca8': { name: 'Marketing',            apiPrefix: 'marketing-reports',           byDate: 'by-date' },
};

// Badge config for report periods
const PERIOD_CONFIG = {
  daily:   { label: 'Daily',   icon: CalendarDays,  color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50' },
  weekly:  { label: 'Weekly',  icon: CalendarRange,  color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50' },
  monthly: { label: 'Monthly', icon: BarChart3,      color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/50' },
};

const EmployeeReports = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(null); // empId being downloaded
  const [downloadingReportId, setDownloadingReportId] = useState(null); // specific saved report being downloaded
  const [errorMsg, setErrorMsg] = useState(null);

  const [expandedEmpId, setExpandedEmpId] = useState(null);
  const [sortOrders, setSortOrders] = useState({}); // empId -> 'newest' | 'oldest'
  const [periodFilters, setPeriodFilters] = useState({}); // empId -> 'all' | 'daily' | 'weekly' | 'monthly'
  const [uploadedReportsMap, setUploadedReportsMap] = useState({});
  const [loadingReportsMap, setLoadingReportsMap] = useState({});

  const { showToast } = useToast();

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const fetchUploadedReports = useCallback(async (empId, sortOrder = 'newest') => {
    try {
      setLoadingReportsMap(prev => ({ ...prev, [empId]: true }));
      const res = await fetch(`${API_BASE}/v1/employee-reports/list?userId=${empId}&sort=${sortOrder}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setUploadedReportsMap(prev => ({ ...prev, [empId]: data.data }));
        }
      }
    } catch (err) {
      console.error(`Failed to fetch PDF reports for ${empId}:`, err);
    } finally {
      setLoadingReportsMap(prev => ({ ...prev, [empId]: false }));
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/user/list`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const emps = Array.isArray(data) ? data : [];
          setEmployees(emps);
          emps.forEach(emp => {
            const empId = emp._id || emp.id;
            fetchUploadedReports(empId, 'newest');
          });
        }
      } catch (err) {
        console.error('Failed to load employee list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [getAuthHeaders, fetchUploadedReports]);

  const filteredEmployees = employees.filter(emp => {
    const nameMatch = (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  const getDesignationConfig = (emp) => {
    const desigId = emp.designationId?._id || emp.designationId || emp.designation_id;
    if (DESIGNATION_API_MAP[desigId]) return DESIGNATION_API_MAP[desigId];
    const desigName = String(emp.designation || emp.designationId?.name || '').toLowerCase();
    if (desigName.includes('developer')) return DESIGNATION_API_MAP['6a1e8e2d01a0dae8b2f3b18c'];
    if (desigName.includes('hod') || desigName.includes('r&d')) return DESIGNATION_API_MAP['6a2f9e086f1c41b0c80a9e21'];
    if (desigName.includes('graphic')) return DESIGNATION_API_MAP['6a1e8e6e01a0dae8b2f3b18d'];
    if (desigName.includes('counselor')) return DESIGNATION_API_MAP['6a27939af292348deb7d0495'];
    if (desigName.includes('video')) return DESIGNATION_API_MAP['6a2f912c2df21dc234018caa'];
    if (desigName.includes('hr')) return DESIGNATION_API_MAP['6a2f8efea2fe388770a38987'];
    if (desigName.includes('ops') || desigName.includes('operations')) return DESIGNATION_API_MAP['6a2f91472df21dc234018cab'];
    if (desigName.includes('accountant')) return DESIGNATION_API_MAP['6a2f915e2df21dc234018cac'];
    if (desigName.includes('marketing') || desigName.includes('marketer')) return DESIGNATION_API_MAP['6a2f909d2df21dc234018ca8'];
    return null;
  };

  // Download latest daily report for an employee
  const handleDownload = async (emp) => {
    const config = getDesignationConfig(emp);
    if (!config) {
      setErrorMsg(`No report template configured for ${emp.name || 'this employee'} (${emp.designationId?.name || 'unknown designation'}).`);
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    const empId = emp._id || emp.id;
    setDownloading(empId);
    setErrorMsg(null);
    showToast("Generating PDF on server...", "info");

    try {
      const today = new Date().toISOString().split('T')[0];
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/"/g, '') : '';
      const headers = {
        'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`
      };

      const reportTypeSlug = config.apiPrefix.replace('-reports', '');
      let url = `${API_BASE}/v1/employee-reports/generate-pdf?userId=${empId}&dateString=${today}&reportType=${reportTypeSlug}`;
      let res = await fetch(url, { headers });

      if (!res.ok) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        url = `${API_BASE}/v1/employee-reports/generate-pdf?userId=${empId}&dateString=${yStr}&reportType=${reportTypeSlug}`;
        res = await fetch(url, { headers });
      }

      if (res.ok) {
        const blob = await res.blob();
        console.log(`[Diagnostic] Generated blob size: ${blob.size} bytes, type: ${blob.type}`);
        const filename = `${config.name.replace(/\s+/g, '_')}_Report_${(emp.name || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_')}_Daily.pdf`;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        }, 15000);
        const currentSort = sortOrders[empId] || 'newest';
        fetchUploadedReports(empId, currentSort);
        showToast(`PDF report generated and downloaded successfully! (Size: ${blob.size} bytes)`, "success");
      } else {
        setErrorMsg(`No report found for ${emp.name || 'this employee'} for today or yesterday.`);
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (err) {
      console.error('Download failed:', err);
      setErrorMsg('Failed to generate PDF. Please try again.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setDownloading(null);
    }
  };

  // Download a specific saved report (daily/weekly/monthly) from the history list
  const handleDownloadSavedReport = async (emp, report) => {
    const token = localStorage.getItem('token');
    const cleanToken = token ? token.replace(/"/g, '') : '';
    const headers = {
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`
    };

    setDownloadingReportId(report._id);
    showToast(`Downloading ${report.report_period || 'report'} PDF...`, "info");

    try {
      let res;
      let filename;

      // Stream the saved PDF file (daily/weekly/monthly) from storage via backend proxy
      const url = `${API_BASE}/v1/employee-reports/stream/${report._id}`;
      res = await fetch(url, { headers });
      filename = report.filename || `${report.report_period || 'daily'}_Report_${report.report_date}.pdf`;

      if (res.ok) {
        const blob = await res.blob();
        console.log(`[Diagnostic] Saved report blob size: ${blob.size} bytes, type: ${blob.type}`);
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        }, 15000);
        showToast(`Report downloaded successfully! (Size: ${blob.size} bytes)`, "success");
      } else {
        showToast("Failed to download report. Please try again.", "error");
      }
    } catch (err) {
      console.error('Download saved report failed:', err);
      showToast("Error downloading report.", "error");
    } finally {
      setDownloadingReportId(null);
    }
  };

  const handleSortChange = (empId, newSortOrder) => {
    setSortOrders(prev => ({ ...prev, [empId]: newSortOrder }));
    fetchUploadedReports(empId, newSortOrder);
  };

  const handlePeriodFilterChange = (empId, period) => {
    setPeriodFilters(prev => ({ ...prev, [empId]: period }));
  };

  const toggleExpand = (empId) => {
    setExpandedEmpId(prev => prev === empId ? null : empId);
  };

  const getFilteredReports = (empId) => {
    const allReports = uploadedReportsMap[empId] || [];
    const filter = periodFilters[empId] || 'all';
    if (filter === 'all') return allReports;
    return allReports.filter(r => r.report_period === filter);
  };

  const getReportCounts = (empId) => {
    const all = uploadedReportsMap[empId] || [];
    return {
      all: all.length,
      daily: all.filter(r => r.report_period === 'daily').length,
      weekly: all.filter(r => r.report_period === 'weekly').length,
      monthly: all.filter(r => r.report_period === 'monthly').length,
    };
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
            Click on an employee card to reveal their saved <span className="font-semibold text-indigo-500">Daily</span>, <span className="font-semibold text-emerald-500">Weekly</span> &amp; <span className="font-semibold text-violet-500">Monthly</span> PDF reports.
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

      {/* Error Banner */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-2xl px-5 py-4 text-sm text-red-700 dark:text-red-400"
        >
          <AlertCircle size={18} className="shrink-0" />
          {errorMsg}
        </motion.div>
      )}

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
        <div className="overflow-x-auto bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/20">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Saved Reports</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredEmployees.map((emp) => {
                const config = getDesignationConfig(emp);
                const initial = emp.name ? emp.name.charAt(0).toUpperCase() : '?';
                const empId = emp._id || emp.id;
                const isDownloading = downloading === empId;
                const isExpanded = expandedEmpId === empId;
                const sortOrder = sortOrders[empId] || 'newest';
                const periodFilter = periodFilters[empId] || 'all';
                const counts = getReportCounts(empId);
                const visibleReports = getFilteredReports(empId);

                return (
                  <React.Fragment key={empId}>
                    {/* Main Employee Row */}
                    <tr 
                      onClick={() => toggleExpand(empId)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-sm font-bold border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {emp.name}
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-0.5">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-wider bg-indigo-50/50 dark:bg-lime-950/20 px-2.5 py-0.5 rounded-full inline-block">
                          {emp.designationId?.name || emp.designation || emp.role || 'Staff Member'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {counts.all === 0 ? (
                            <span className="text-xs text-slate-400 dark:text-slate-650 italic">No reports yet</span>
                          ) : (
                            <>
                              {counts.daily > 0 && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50">
                                  {counts.daily} Daily
                                </span>
                              )}
                              {counts.weekly > 0 && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50">
                                  {counts.weekly} Weekly
                                </span>
                              )}
                              {counts.monthly > 0 && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/50">
                                  {counts.monthly} Monthly
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          {/* Download Latest Daily */}
                          <button
                            onClick={() => handleDownload(emp)}
                            disabled={isDownloading}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                              config
                                ? 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40 hover:shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800/50 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {isDownloading ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <FileDown size={12} />
                            )}
                            <span className="hidden sm:inline">Latest</span>
                          </button>

                          {/* Toggle Expand Arrow */}
                          <button
                            onClick={() => toggleExpand(empId)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-300 transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable History Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/30 dark:bg-slate-900/10">
                        <td colSpan={4} className="px-6 py-4">
                          <div className="overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            {/* Header row: count + sort */}
                            <div className="flex items-center justify-between border-t border-slate-150/40 dark:border-slate-800/30 pt-3 mb-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Saved Reports ({counts.all})
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">Sort:</span>
                                <select
                                  value={sortOrder}
                                  onChange={(e) => handleSortChange(empId, e.target.value)}
                                  className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 border-none rounded-lg px-2 py-1 outline-none cursor-pointer transition-colors"
                                >
                                  <option value="newest">Newest First</option>
                                  <option value="oldest">Oldest First</option>
                                </select>
                              </div>
                            </div>

                            {/* Period filter tabs */}
                            <div className="flex items-center gap-1 mb-3 flex-wrap">
                              {[
                                { value: 'all',     label: `All (${counts.all})`,           cls: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
                                { value: 'daily',   label: `Daily (${counts.daily})`,        cls: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
                                { value: 'weekly',  label: `Weekly (${counts.weekly})`,      cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
                                { value: 'monthly', label: `Monthly (${counts.monthly})`,    cls: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800' },
                              ].map(tab => (
                                <button
                                  key={tab.value}
                                  onClick={() => handlePeriodFilterChange(empId, tab.value)}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                    periodFilter === tab.value
                                      ? `${tab.cls} ring-1 ring-current`
                                      : 'text-slate-450 dark:text-slate-650 bg-transparent border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>

                            {/* Reports list */}
                            {loadingReportsMap[empId] ? (
                              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                                <Loader2 size={12} className="animate-spin text-indigo-500" />
                                <span>Loading reports...</span>
                              </div>
                            ) : visibleReports.length === 0 ? (
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                                {counts.all === 0 ? 'No PDF reports saved yet.' : `No ${periodFilter} reports found.`}
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1 py-1">
                                {visibleReports.map((report) => {
                                  const period = report.report_period || 'daily';
                                  const pConf = PERIOD_CONFIG[period] || PERIOD_CONFIG.daily;
                                  const PeriodIcon = pConf.icon;
                                  const isThisDownloading = downloadingReportId === report._id;

                                  return (
                                    <button
                                      key={report._id}
                                      onClick={() => {
                                        if (!isThisDownloading) handleDownloadSavedReport(emp, report);
                                      }}
                                      disabled={isThisDownloading}
                                      className="flex items-center justify-between px-3 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800/30 dark:hover:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800/50 rounded-xl text-left transition-all hover:shadow-sm group/row"
                                      title={`Download ${period} report — ${report.report_date}`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border shrink-0 ${pConf.color}`}>
                                          <PeriodIcon size={9} />
                                          {pConf.label}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-350 truncate">
                                          {report.report_date}
                                        </span>
                                      </div>
                                      {isThisDownloading ? (
                                        <Loader2 size={12} className="animate-spin text-indigo-500 shrink-0" />
                                      ) : (
                                        <FileDown size={12} className="opacity-40 group-hover/row:opacity-85 shrink-0 text-slate-500 dark:text-slate-400 transition-opacity" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeeReports;
