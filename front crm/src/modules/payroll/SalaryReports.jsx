import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Search, 
  Calendar,
  Filter,
  TrendingUp,
  User,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { getMonthlySalaryReport, getEmployeeSalaryHistory } from '../../services/payrollService';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const SalaryReports = () => {
  const [loading, setLoading] = useState(true);
  const [reportTab, setReportTab] = useState('monthly'); // 'monthly', 'history'
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  // Data states
  const [monthlyData, setMonthlyData] = useState([]);
  const [historyData, setHistoryData] = useState([]);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);

  const fetchEmployeesList = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/users/list`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEmployees(data.data);
        if (data.data.length > 0) {
          setSelectedEmployeeId(data.data[0]._id);
        }
      } else if (Array.isArray(data)) {
        setEmployees(data);
        if (data.length > 0) {
          setSelectedEmployeeId(data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load employee list:', err);
    }
  };

  const fetchMonthlyReport = async () => {
    if (!salaryMonth) return;
    try {
      setLoading(true);
      const res = await getMonthlySalaryReport(`${salaryMonth}-01`);
      if (res.success) {
        setMonthlyData(res.data || []);
      }
    } catch (err) {
      console.error('Failed to retrieve monthly salary report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryReport = async () => {
    if (!selectedEmployeeId) return;
    try {
      setLoading(true);
      const res = await getEmployeeSalaryHistory(selectedEmployeeId);
      if (res.success) {
        // Sort history by date ascending for trend chart plotting
        const sorted = (res.data || []).sort((a, b) => new Date(a.salaryMonth) - new Date(b.salaryMonth));
        setHistoryData(sorted);
      }
    } catch (err) {
      console.error('Failed to retrieve employee history report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
  }, []);

  useEffect(() => {
    if (reportTab === 'monthly') {
      fetchMonthlyReport();
    } else {
      fetchHistoryReport();
    }
  }, [reportTab, salaryMonth, selectedEmployeeId]);

  // Compute total aggregates for monthly sheet
  const monthlyAggregates = useMemo(() => {
    let basic = 0;
    let earnings = 0;
    let deductions = 0;
    let net = 0;

    monthlyData.forEach(item => {
      basic += item.basicSalary || 0;
      earnings += item.totalEarnings || 0;
      deductions += item.totalDeductions || 0;
      net += item.netSalary || 0;
    });

    return { basic, earnings, deductions, net };
  }, [monthlyData]);

  // Excel Export action
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const todayStr = new Date().toISOString().split('T')[0];

    if (reportTab === 'monthly') {
      const headers = [
        'Employee Name', 'Email', 'Designation', 'Basic Salary (₹)', 'Total Earnings (₹)', 
        'Total Deductions (₹)', 'Net Pay (₹)', 'Status'
      ];
      const rows = monthlyData.map(s => [
        s.employeeId?.name || 'N/A',
        s.employeeId?.email || 'N/A',
        s.employeeId?.designationId?.name || 'Staff',
        s.basicSalary,
        s.totalEarnings,
        s.totalDeductions,
        s.netSalary,
        s.status
      ]);

      const ws = XLSX.utils.aoa_to_sheet([
        [`MONTHLY PAYROLL SHEET SUMMARY - ${salaryMonth}`, ''],
        [`Generated Date:`, todayStr],
        [],
        headers,
        ...rows,
        [],
        ['TOTALS', '', '', monthlyAggregates.basic, monthlyAggregates.earnings, monthlyAggregates.deductions, monthlyAggregates.net]
      ]);
      XLSX.utils.book_append_sheet(workbook, ws, 'Monthly Payroll');
    } else {
      const selectedEmpObj = employees.find(e => e._id === selectedEmployeeId);
      const empName = selectedEmpObj ? selectedEmpObj.name : 'Employee';

      const headers = [
        'Month Period', 'Basic Salary (₹)', 'Allowances Subtotal (₹)', 'Bonus (₹)', 
        'Deductions Withheld (₹)', 'Net Salary Disbursed (₹)', 'Disbursement Method', 'Slip #'
      ];
      const rows = historyData.map(s => {
        const allowances = s.totalEarnings - s.basicSalary - s.bonus - s.incentive;
        return [
          new Date(s.salaryMonth).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          s.basicSalary,
          allowances,
          s.bonus + s.incentive,
          s.totalDeductions,
          s.netSalary,
          s.paymentMethod || 'Bank Transfer',
          s.salarySlipNumber || 'N/A'
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([
        [`PAYROLL HISTORY LEDGER - ${empName.toUpperCase()}`, ''],
        [`Generated Date:`, todayStr],
        [],
        headers,
        ...rows
      ]);
      XLSX.utils.book_append_sheet(workbook, ws, 'Employee History');
    }

    XLSX.writeFile(workbook, `Salary_Report_${reportTab.toUpperCase()}_${todayStr}.xlsx`);
  };

  // High-fidelity custom SVG Sparkline chart builder for salary history trend
  const sparklineChart = useMemo(() => {
    if (historyData.length < 2) return null;
    
    const width = 600;
    const height = 150;
    const padding = 30;

    const values = historyData.map(h => h.netSalary);
    const minVal = Math.min(...values) * 0.9;
    const maxVal = Math.max(...values) * 1.1;
    const valRange = maxVal - minVal;

    const points = historyData.map((h, i) => {
      const x = padding + (i / (historyData.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((h.netSalary - minVal) / valRange) * (height - 2 * padding);
      return { x, y, val: h.netSalary, month: new Date(h.salaryMonth).toLocaleString('default', { month: 'short' }) };
    });

    const pathData = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    const fillPathData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="w-full bg-slate-900/40 border border-slate-800/80 p-4 rounded-3xl space-y-2">
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Salary Take-home Pay Trend</span>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" strokeWidth="1" />

          {/* Area under path */}
          <path d={fillPathData} fill="url(#chartGrad)" />

          {/* Line Path */}
          <path d={pathData} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" className="fill-indigo-500 stroke-slate-900 stroke-2 cursor-pointer hover:r-6" />
              <text x={p.x} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
                {p.month}
              </text>
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="black" fontFamily="monospace">
                ₹{Math.round(p.val / 1000)}k
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }, [historyData]);

  return (
    <div className="space-y-6">
      
      {/* HEADER TABS ROW */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md p-4 rounded-3xl">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/30 dark:border-slate-800/50">
          <button
            onClick={() => setReportTab('monthly')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
              ${reportTab === 'monthly' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-lime-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            Monthly Sheet Summary
          </button>
          <button
            onClick={() => setReportTab('history')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
              ${reportTab === 'history' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-lime-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            Employee Ledger
          </button>
        </div>

        <div className="flex items-center gap-2">
          {reportTab === 'monthly' ? (
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="month"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs w-48 focus:outline-none"
              />
            </div>
          ) : (
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {employees.map(e => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md"
          >
            <FileSpreadsheet size={14} />
            <span>Export Sheet</span>
          </button>
        </div>
      </div>

      {/* RENDER SHEETS */}
      {loading ? (
        <div className="flex justify-center items-center py-24 text-slate-400">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mr-2"
          />
          <span>Aggregating payroll distributions...</span>
        </div>
      ) : reportTab === 'monthly' ? (
        
        /* MONTHLY SUMMARY */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Gross Salaries Disbursed</span>
              <span className="text-2xl font-black text-white">₹{monthlyAggregates.net.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Allowance Incentives</span>
              <span className="text-2xl font-black text-white">₹{(monthlyAggregates.earnings - monthlyAggregates.basic).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">PF & Tax Withholdings</span>
              <span className="text-2xl font-black text-white">₹{monthlyAggregates.deductions.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Total Staff Paid</span>
              <span className="text-2xl font-black text-white">{monthlyData.length} employees</span>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-800/60 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6 text-right">Basic Salary</th>
                    <th className="py-3.5 px-6 text-right">Allowances</th>
                    <th className="py-3.5 px-6 text-right">Deductions</th>
                    <th className="py-3.5 px-6 text-right">Net Take-home Pay</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 text-xs">
                  {monthlyData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        No disbursed salaries recorded for {salaryMonth}.
                      </td>
                    </tr>
                  ) : (
                    monthlyData.map((item, idx) => {
                      const allowances = item.totalEarnings - item.basicSalary;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="py-3.5 px-6">
                            <div className="font-bold text-slate-900 dark:text-white">{item.employeeId?.name || 'N/A'}</div>
                            <span className="text-[10px] text-slate-400 block">{item.employeeId?.email}</span>
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono">₹{item.basicSalary.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-6 text-right font-mono text-emerald-500">+₹{allowances.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-6 text-right font-mono text-rose-500">-₹{item.totalDeductions.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-6 text-right font-black text-slate-900 dark:text-white font-mono">₹{item.netSalary.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-6 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        
        /* INDIVIDUAL LEDGER */
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {historyData.length >= 2 && sparklineChart}

          <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50">
              <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">Annual Salary Ledger Sheets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-800/60 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                    <th className="py-3 px-6">Salary Month</th>
                    <th className="py-3 px-6 text-right">Basic Salary</th>
                    <th className="py-3 px-6 text-right">Allowances</th>
                    <th className="py-3 px-6 text-right">Deductions</th>
                    <th className="py-3 px-6 text-right">Net Paid</th>
                    <th className="py-3 px-6 text-center">Payment Mode</th>
                    <th className="py-3 px-6 text-center">Slip Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                  {historyData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        No historical payroll records found for this employee.
                      </td>
                    </tr>
                  ) : (
                    historyData.map((h, idx) => {
                      const allowances = h.totalEarnings - h.basicSalary;
                      const monthLabel = new Date(h.salaryMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="py-3 px-6 font-bold">{monthLabel}</td>
                          <td className="py-3 px-6 text-right font-mono">₹{h.basicSalary.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-6 text-right font-mono text-emerald-500">+₹{allowances.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-6 text-right font-mono text-rose-500">-₹{h.totalDeductions.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-6 text-right font-black text-slate-900 dark:text-white font-mono">₹{h.netSalary.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-6 text-center font-semibold text-slate-500">{h.paymentMethod || 'Bank Transfer'}</td>
                          <td className="py-3 px-6 text-center font-mono font-semibold text-indigo-400">{h.salarySlipNumber || 'N/A'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalaryReports;
