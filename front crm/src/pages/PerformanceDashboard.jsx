import React, { useState, useEffect, useCallback } from 'react';
import { 
  Award, TrendingUp, Users, AlertTriangle, ShieldCheck, 
  BarChart3, FileSpreadsheet, Download, RefreshCw, Calendar,
  Filter, Search, CheckCircle2, ChevronRight, Zap, ArrowUpRight
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL;

const PerformanceDashboard = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportType, setReportType] = useState('monthly');
  const [reportsData, setReportsData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/performance/analytics?month=${month}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
      showToast('Error loading KPI analytics.', 'error');
    } finally {
      setLoading(false);
    }
  }, [month, getAuthHeaders, showToast]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/performance/reports?type=${reportType}&month=${month}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.data?.records) {
        setReportsData(data.data.records);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    }
  }, [reportType, month, getAuthHeaders]);

  useEffect(() => {
    fetchAnalytics();
    fetchReports();
  }, [fetchAnalytics, fetchReports]);

  const handleExportCSV = () => {
    if (!reportsData.length) {
      showToast('No report records to export.', 'warning');
      return;
    }
    const headers = ['Employee Name', 'Employee ID', 'Department', 'KPI Score', 'Grade', 'Status'];
    const rows = reportsData.map(r => [
      `"${r.employeeName}"`,
      `"${r.employeeId}"`,
      `"${r.department}"`,
      r.kpiScore,
      `"${r.grade}"`,
      `"${r.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KPI_Performance_Report_${month}_${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV report exported successfully!', 'success');
  };

  const filteredReports = reportsData.filter(r => 
    r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.grade?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-500 pb-12">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ── Top Header ── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter uppercase leading-none">
              ENTERPRISE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-lime-400">KPI ANALYTICS</span>
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">Cross-Department Performance Insights & Evaluation Intelligence</p>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
            <button
              onClick={handleExportCSV}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Download size={14} /> Export Report
            </button>
          </div>
        </header>

        {/* ── Cards Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Average KPI */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Average System KPI</span>
              <TrendingUp size={20} className="text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {analytics?.averageKPI || 84}%
              </span>
              <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                <ArrowUpRight size={12} /> +3.2%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Active Evaluated Staff: {analytics?.totalEvaluated || 14}</p>
          </div>

          {/* Highest Performer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top Performer</span>
              <Award size={20} className="text-amber-500" />
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100 block truncate">
              {analytics?.highestPerformer?.name || 'Lead Architect'}
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-black text-amber-500">{analytics?.highestPerformer?.score || 96}% Score</span>
              <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                {analytics?.highestPerformer?.grade || 'Outstanding'}
              </span>
            </div>
          </div>

          {/* Top Department */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top Department</span>
              <ShieldCheck size={20} className="text-emerald-500" />
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100 block truncate uppercase">
              {analytics?.topDepartment || 'Development'}
            </span>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">Top Team Lead: <strong className="text-slate-700 dark:text-slate-300">{analytics?.topTeamLead || 'Lead Tech'}</strong></p>
          </div>

          {/* Needing Improvement */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Needs Improvement</span>
              <AlertTriangle size={20} className="text-rose-500" />
            </div>
            <span className="text-3xl font-black text-rose-500">
              {analytics?.employeesNeedingImprovement?.length || 1}
            </span>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">Staff requiring upskilling support</p>
          </div>

        </div>

        {/* ── Reports & Filtering Section ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'monthly', label: 'Monthly Report' },
                { id: 'quarterly', label: 'Quarterly Review' },
                { id: 'annual', label: 'Annual Review' },
                { id: 'top', label: 'Top Performers' },
                { id: 'improvement', label: 'Improvement List' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setReportType(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    reportType === t.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs w-full">
              <input 
                type="text" 
                placeholder="Search staff, dept, grade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-9 pr-3 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">KPI Score</th>
                  <th className="py-3.5 px-4">Grade</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {filteredReports.length > 0 ? (
                  filteredReports.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{row.employeeName}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">{row.employeeId}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-semibold">{row.department}</td>
                      <td className="py-3.5 px-4 font-black text-indigo-600 dark:text-indigo-400">{row.kpiScore}%</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold uppercase text-emerald-500">
                          {row.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No evaluation reports discovered for {month}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
};

export default PerformanceDashboard;
