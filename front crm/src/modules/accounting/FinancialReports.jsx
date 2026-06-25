import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  FileText, 
  Calendar,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react';
import { getDashboardStats } from '../../services/accountingService';
import * as XLSX from 'xlsx';

const FinancialReports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('pl'); // 'pl', 'cashflow', 'tax'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to retrieve financial report metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Compute values for P&L Statement
  const plData = useMemo(() => {
    if (!stats?.kpis) return null;
    const { totalIncome, totalExpenses, totalPurchases, salaryExpenses } = stats.kpis;
    const revenue = totalIncome;
    const cogs = totalPurchases;
    const grossProfit = revenue - cogs;
    const opex = totalExpenses + salaryExpenses;
    const netProfit = grossProfit - opex;

    return {
      revenue,
      cogs,
      grossProfit,
      opex,
      expenses: totalExpenses,
      salaries: salaryExpenses,
      netProfit,
      grossMargin: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0',
      netMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0'
    };
  }, [stats]);

  // Compute Cash Flow data
  const cashFlowData = useMemo(() => {
    if (!stats?.monthlyTrends) return [];
    
    // Calculate cumulative balances starting from a baseline
    let cumulative = 500000.00; // Simulated opening balance
    return stats.monthlyTrends.map(t => {
      const inflow = t.income;
      const outflow = t.expense + t.purchase + t.salary;
      const netChange = inflow - outflow;
      cumulative += netChange;

      return {
        month: t.month,
        inflow,
        outflow,
        netChange,
        balance: cumulative
      };
    });
  }, [stats]);

  // Compute GST/TDS tax summary
  const taxData = useMemo(() => {
    if (!stats?.kpis) return null;
    
    // Invoices GST: 18% standard
    const gstCollected = Number((stats.kpis.totalIncome * 0.18).toFixed(2));
    
    // Purchases & Expenses GST: input credits (approx 18%)
    const gstInputCredit = Number(((stats.kpis.totalExpenses + stats.kpis.totalPurchases) * 0.18).toFixed(2));
    
    const netGstPayable = gstCollected - gstInputCredit;

    // Simulated Professional Tax + salary TDS
    const tdsCollected = Number((stats.kpis.salaryExpenses * 0.10).toFixed(2)); // Standard 10% average TDS bracket

    return {
      gstCollected,
      gstInputCredit,
      netGstPayable,
      tdsCollected,
      gstStatus: netGstPayable >= 0 ? 'Payable' : 'Refund Claimable'
    };
  }, [stats]);

  // Excel Export action
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const todayStr = new Date().toISOString().split('T')[0];

    if (activeTab === 'pl' && plData) {
      const rows = [
        ['PROFIT & LOSS STATEMENT (YTD)', ''],
        ['Generated Date:', todayStr],
        ['Financial Year:', `${selectedYear}-${selectedYear + 1}`],
        [],
        ['Particulars', 'Amount (₹)'],
        ['OPERATING REVENUE (INCOME)', plData.revenue],
        ['Less: COST OF GOODS SOLD (PURCHASES)', plData.cogs],
        ['GROSS PROFIT', plData.grossProfit],
        ['Gross Profit Margin (%)', `${plData.grossMargin}%`],
        [],
        ['OPERATING EXPENSES (OPEX)', ''],
        ['  General & Admin Expenses', plData.expenses],
        ['  Employee Payroll Salaries', plData.salaries],
        ['TOTAL OPERATING EXPENSES', plData.opex],
        [],
        ['NET OPERATING PROFIT', plData.netProfit],
        ['Net Profit Margin (%)', `${plData.netMargin}%`]
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, ws, 'Profit & Loss');
    } else if (activeTab === 'cashflow') {
      const headers = ['Month', 'Cash Inflow (₹)', 'Cash Outflow (₹)', 'Net Change (₹)', 'Closing Cash Balance (₹)'];
      const rows = cashFlowData.map(c => [c.month, c.inflow, c.outflow, c.netChange, c.balance]);
      const ws = XLSX.utils.aoa_to_sheet([['CASH FLOW STATEMENT - PROJECTIONS', ''], ...rows]);
      XLSX.utils.book_append_sheet(workbook, ws, 'Cash Flow');
    } else if (activeTab === 'tax' && taxData) {
      const rows = [
        ['TAXATION SUMMARY REPORT', ''],
        ['Date Range:', `Jan ${selectedYear} - Dec ${selectedYear}`],
        [],
        ['Tax Component', 'Amount (₹)', 'Type / Status'],
        ['Output GST Collected', taxData.gstCollected, 'Collected from Sales/Invoices'],
        ['Input Tax Credit (ITC) Claimed', taxData.gstInputCredit, 'Paid on Expenses & Purchases'],
        ['Net GST Liability', Math.abs(taxData.netGstPayable), taxData.netGstPayable >= 0 ? 'Payable' : 'Credit Refundable'],
        ['TDS Deducted (Salaries)', taxData.tdsCollected, 'Withheld from Employee Payroll'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, ws, 'TDS & GST Summary');
    }

    XLSX.writeFile(workbook, `Financial_Report_${activeTab.toUpperCase()}_${todayStr}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mr-2"
        />
        <span>Analyzing ledger databases and formatting sheets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROL BLOCK */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md p-4 rounded-3xl">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/30 dark:border-slate-800/50">
          <button
            onClick={() => setActiveTab('pl')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
              ${activeTab === 'pl' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-lime-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
              ${activeTab === 'cashflow' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-lime-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            Cash Flow
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
              ${activeTab === 'tax' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-lime-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            GST & TDS Summary
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-2xl"
          >
            <option value={new Date().getFullYear()}>{new Date().getFullYear()} - YTD</option>
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
          </select>

          <button
            onClick={handlePrint}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500"
            title="Print report layout"
          >
            <Printer size={15} />
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md"
          >
            <FileSpreadsheet size={14} />
            <span>Export Sheet</span>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC WORKSPACE SHEETS */}
      <AnimatePresence mode="wait">
        
        {/* PROFIT & LOSS WORKSPACE */}
        {activeTab === 'pl' && plData && (
          <motion.div
            key="pl-sheet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Gross Operating Income</span>
                <span className="text-2xl font-black text-white">₹{plData.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Gross Profit Margin</span>
                <span className="text-2xl font-black text-white">{plData.grossMargin}%</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Operating Expenses</span>
                <span className="text-2xl font-black text-white">₹{plData.opex.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
                <span className="text-[9px] font-black uppercase tracking-widest text-lime-400">Net Profit Margin</span>
                <span className="text-2xl font-black text-white">{plData.netMargin}%</span>
              </div>
            </div>

            {/* HIGH FIDELITY P&L REPORT CARD */}
            <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md p-6 rounded-3xl space-y-6 max-w-3xl mx-auto">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Profit & Loss Statement (YTD)
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">
                  For the Period Ending December 31, {selectedYear}
                </p>
              </div>

              <div className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
                
                {/* 1. Revenue */}
                <div className="py-4 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    <span>1. Operating Revenue</span>
                    <span className="font-mono">₹{plData.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-slate-400 text-[11px]">
                    <span>Invoiced Client Sales Settlements</span>
                    <span className="font-mono">₹{plData.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* 2. COGS */}
                <div className="py-4 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    <span>2. Less: Cost of Goods Sold (COGS)</span>
                    <span className="font-mono text-rose-500">₹{plData.cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-slate-400 text-[11px]">
                    <span>Procurements & Vendor Purchases Ledger</span>
                    <span className="font-mono">₹{plData.cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* 3. Gross Profit */}
                <div className="py-4 bg-slate-50 dark:bg-slate-950/20 px-3 rounded-xl flex justify-between font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  <span>Gross Profit (1 - 2)</span>
                  <span className="font-mono text-lime-400">₹{plData.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* 4. Operating Expenses */}
                <div className="py-4 space-y-2">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    <span>4. Operating Expenses (OPEX)</span>
                    <span className="font-mono text-rose-500">₹{plData.opex.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-slate-400 text-[11px]">
                    <span>General Operating & Miscellaneous Expenses</span>
                    <span className="font-mono">₹{plData.expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pl-4 text-slate-400 text-[11px]">
                    <span>Employee Payroll Salaries Disbursements</span>
                    <span className="font-mono">₹{plData.salaries.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* 5. Net profit */}
                <div className="py-4 bg-indigo-600 text-white px-4 rounded-xl flex justify-between font-black text-sm uppercase tracking-wider shadow-md shadow-indigo-600/10">
                  <span>Net Operating Profit</span>
                  <span className="font-mono">₹{plData.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

              </div>

              <div className="flex gap-2 p-3 bg-indigo-600/5 rounded-xl border border-indigo-500/10">
                <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-[10px] text-slate-400">
                  Calculated dynamically from real-time MongoDB database state. General operating expenses exclude GST taxation which is resolved separately in the GST worksheets.
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* CASH FLOW STATEMENT */}
        {activeTab === 'cashflow' && (
          <motion.div
            key="cashflow-sheet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Cash Flow Projection Ledgers
                </h3>
                <span className="text-[10px] text-slate-400">Simulated monthly trends, actual operating inflows and outflows</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 dark:border-slate-800/60 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                      <th className="py-3.5 px-4">Period Month</th>
                      <th className="py-3.5 px-4 text-right">Cash Inflow (₹)</th>
                      <th className="py-3.5 px-4 text-right">Cash Outflow (₹)</th>
                      <th className="py-3.5 px-4 text-right">Net Month Change (₹)</th>
                      <th className="py-3.5 px-4 text-right">Estimated Closing Cash (₹)</th>
                      <th className="py-3.5 px-4 text-center">Trend Flow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                    {cashFlowData.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                        <td className="py-3 px-4 font-bold">{c.month}</td>
                        <td className="py-3 px-4 text-right text-emerald-500 font-semibold font-mono">
                          +₹{c.inflow.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-500 font-semibold font-mono">
                          -₹{c.outflow.toLocaleString('en-IN')}
                        </td>
                        <td className={`py-3 px-4 text-right font-black font-mono
                          ${c.netChange >= 0 ? 'text-lime-400' : 'text-rose-500'}`}>
                          {c.netChange >= 0 ? '+' : ''}₹{c.netChange.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                          ₹{c.balance.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.netChange >= 0 ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-lime-400/10 text-lime-400 text-[9px] font-bold">
                              <TrendingUp size={10} /> Positive
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[9px] font-bold">
                              <TrendingDown size={10} /> Deficit
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAXATION WORKSPACE */}
        {activeTab === 'tax' && taxData && (
          <motion.div
            key="tax-sheet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Output GST Collected</span>
                <span className="text-2xl font-black text-white">₹{taxData.gstCollected.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Input Tax Credit (ITC)</span>
                <span className="text-2xl font-black text-white">₹{taxData.gstInputCredit.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-24">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">TDS Collections (Salaries)</span>
                <span className="text-2xl font-black text-white">₹{taxData.tdsCollected.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md p-6 rounded-3xl space-y-6 max-w-2xl mx-auto">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  GST & TDS Returns Worksheet
                </h3>
                <span className="text-[10px] text-slate-400">Tax filing computations computed for the current financial year</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                
                <div className="py-3 flex justify-between">
                  <span className="font-semibold text-slate-500">Output GST (Invoiced Sales @ 18%):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{taxData.gstCollected.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="py-3 flex justify-between">
                  <span className="font-semibold text-slate-500">Input Tax Credit (Expenses/Purchases GST Paid):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{taxData.gstInputCredit.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="py-3.5 flex justify-between bg-slate-50 dark:bg-slate-950/20 px-3 rounded-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  <span>Net GST Liability:</span>
                  <span className={`font-mono ${taxData.netGstPayable >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ₹{Math.abs(taxData.netGstPayable).toLocaleString('en-IN')} ({taxData.gstStatus})
                  </span>
                </div>

                <div className="py-3 flex justify-between pt-4">
                  <span className="font-semibold text-slate-500">TDS (Employee Salary Income Tax Withheld):</span>
                  <span className="font-mono font-bold text-indigo-400">
                    ₹{taxData.tdsCollected.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="py-3 flex justify-between">
                  <span className="font-semibold text-slate-500">Professional Tax (PT Withheld Batch):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{(stats?.kpis?.salaryExpenses ? (stats.kpis.salaryExpenses * 0.01).toFixed(2) : '0.00')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 p-3 bg-slate-950/20 rounded-xl border border-slate-800/60 text-[10px] text-slate-400">
                <Info size={16} className="text-indigo-400 shrink-0" />
                <span>
                  <b>Filing Warning:</b> Ensure all transactions and invoices are marked as 'Paid' to claim full ITC. Unpaid purchase orders cannot be parsed as input credit.
                </span>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};

export default FinancialReports;
