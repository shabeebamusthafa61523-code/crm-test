import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Percent, 
  FileText, 
  Calendar,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';
import { getDashboardStats } from '../../services/accountingService';

const AccountingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeSeries, setActiveSeries] = useState({ income: true, expense: true });
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Recent Activity Feed filters
  const [feedFilterType, setFeedFilterType] = useState('All');
  const [feedSearch, setFeedSearch] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to retrieve accounting stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Compute calculated metrics
  const kpis = useMemo(() => {
    if (!stats?.kpis) return {};
    const { totalIncome, totalExpenses, totalPurchases, salaryExpenses, pendingInvoices, paidInvoices } = stats.kpis;
    const netProfit = totalIncome - totalExpenses - totalPurchases - salaryExpenses;
    
    // Percentage vs revenue
    const expensePercent = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : '0';
    const purchasePercent = totalIncome > 0 ? ((totalPurchases / totalIncome) * 100).toFixed(1) : '0';
    const salaryPercent = totalIncome > 0 ? ((salaryExpenses / totalIncome) * 100).toFixed(1) : '0';
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

    return {
      income: totalIncome,
      expenses: totalExpenses,
      purchases: totalPurchases,
      salaries: salaryExpenses,
      profit: netProfit,
      expensePercent,
      purchasePercent,
      salaryPercent,
      profitMargin,
      pending: pendingInvoices,
      paid: paidInvoices
    };
  }, [stats]);

  // Combine trends data safely
  const trends = useMemo(() => stats?.monthlyTrends || [], [stats]);

  // Combined activity log generated from trend summaries for simulation/UAT demonstration
  const recentActivities = useMemo(() => {
    if (!stats) return [];
    
    // Seed standard activities dynamically from monthly trends and invoice summaries
    const list = [];
    const dateMock = new Date();
    
    if (kpis.income > 0) {
      list.push({
        id: 'TX-1001',
        date: new Date(dateMock.setDate(dateMock.getDate() - 1)).toLocaleDateString('en-IN'),
        type: 'Income',
        ref: 'INV-2026-004',
        desc: 'Customer invoice settlement from Acme Corp',
        amount: 85000.00,
        status: 'Paid'
      });
    }

    if (kpis.expenses > 0) {
      list.push({
        id: 'TX-1002',
        date: new Date(dateMock.setDate(dateMock.getDate() - 2)).toLocaleDateString('en-IN'),
        type: 'Expense',
        ref: 'EXP-10492',
        desc: 'AWS Cloud Hosting monthly subscription billing',
        amount: 14250.00,
        status: 'Paid'
      });
    }

    if (kpis.purchases > 0) {
      list.push({
        id: 'TX-1003',
        date: new Date(dateMock.setDate(dateMock.getDate() - 3)).toLocaleDateString('en-IN'),
        type: 'Purchase',
        ref: 'PO-2026-88',
        desc: 'Office tech procurement: Dell workstations (3 Units)',
        amount: 185000.00,
        status: 'Paid'
      });
    }

    if (kpis.salaries > 0) {
      list.push({
        id: 'TX-1004',
        date: new Date(dateMock.setDate(dateMock.getDate() - 5)).toLocaleDateString('en-IN'),
        type: 'Salary',
        ref: 'PAY-202606-EMP1',
        desc: 'June 2026 automated payroll disbursement batch',
        amount: kpis.salaries,
        status: 'Paid'
      });
    }

    if (kpis.pending?.amount > 0) {
      list.push({
        id: 'TX-1005',
        date: new Date(dateMock.setDate(dateMock.getDate() - 6)).toLocaleDateString('en-IN'),
        type: 'Invoice',
        ref: 'INV-2026-009',
        desc: 'Service retainer billing: Digital branding project',
        amount: kpis.pending.amount,
        status: 'Pending'
      });
    }

    // Filter by type
    return list.filter(act => {
      const matchType = feedFilterType === 'All' || act.type === feedFilterType;
      const matchSearch = !feedSearch || 
        act.desc.toLowerCase().includes(feedSearch.toLowerCase()) || 
        act.ref.toLowerCase().includes(feedSearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [stats, kpis, feedFilterType, feedSearch]);

  // --- SVG 1: Monthly Income vs Expense Line Chart ---
  const renderLineChart = () => {
    if (trends.length === 0) return null;

    const width = 500;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Find max value across both series for single/dual Y axis scaling
    const maxVal = Math.max(
      ...trends.map(t => Math.max(t.income, t.expense, 10000))
    );

    const points = trends.map((t, i) => {
      const x = paddingLeft + (i / (trends.length - 1)) * chartWidth;
      const yInc = paddingTop + chartHeight - (t.income / maxVal) * chartHeight;
      const yExp = paddingTop + chartHeight - (t.expense / maxVal) * chartHeight;
      return { x, yInc, yExp, label: t.month, income: t.income, expense: t.expense };
    });

    const getLineD = (yKey) => {
      return points.reduce((acc, p, i) => {
        return i === 0 ? `M ${p.x} ${p[yKey]}` : `${acc} L ${p.x} ${p[yKey]}`;
      }, "");
    };

    const getAreaD = (yKey, lineD) => {
      if (!lineD) return "";
      return `${lineD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    };

    const incLine = getLineD('yInc');
    const incArea = getAreaD('yInc', incLine);
    const expLine = getLineD('yExp');
    const expArea = getAreaD('yExp', expLine);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* X & Y Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * ratio;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <g key={i} className="opacity-10 dark:opacity-5">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[8px] font-bold fill-current">₹{(val/1000).toFixed(0)}k</text>
            </g>
          );
        })}

        {/* Areas */}
        {activeSeries.income && incArea && <path d={incArea} fill="url(#incGrad)" />}
        {activeSeries.expense && expArea && <path d={expArea} fill="url(#expGrad)" />}

        {/* Lines */}
        {activeSeries.income && incLine && (
          <path d={incLine} fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(79,70,229,0.2)]" />
        )}
        {activeSeries.expense && expLine && (
          <path d={expLine} fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(245,158,11,0.2)]" />
        )}

        {/* Anchors and Dates */}
        {points.map((p, i) => (
          <g key={i} className="group/anchor">
            {activeSeries.income && (
              <circle cx={p.x} cy={p.yInc} r="3" fill="#4f46e5" stroke="#ffffff" strokeWidth="1" className="cursor-pointer" />
            )}
            {activeSeries.expense && (
              <circle cx={p.x} cy={p.yExp} r="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" className="cursor-pointer" />
            )}

            {/* Tooltip Overlay */}
            <g className="opacity-0 group-hover/anchor:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect x={p.x - 45} y={Math.min(p.yInc, p.yExp) - 30} width="90" height="24" rx="4" fill="#0f172a" />
              <text x={p.x} y={Math.min(p.yInc, p.yExp) - 15} textAnchor="middle" fill="#ffffff" className="text-[7.5px] font-bold fill-white">
                {activeSeries.income ? `Inc: ₹${(p.income/1000).toFixed(0)}k` : ''} {activeSeries.expense ? `Exp: ₹${(p.expense/1000).toFixed(0)}k` : ''}
              </text>
            </g>

            {/* Dates */}
            <text x={p.x} y={height - 5} textAnchor="middle" className="text-[8px] font-bold fill-slate-400">{p.label}</text>
          </g>
        ))}
      </svg>
    );
  };

  // --- SVG 2: Category Breakdown Donut Chart ---
  const renderDonutChart = () => {
    const rawData = stats?.categoryBreakdown || [];
    if (rawData.length === 0) return null;

    // Filter categories dynamically
    const chartData = categoryFilter 
      ? rawData.filter(d => d.category === categoryFilter)
      : rawData;

    const total = chartData.reduce((sum, item) => sum + item.amount, 0);
    if (total === 0) return null;

    const size = 180;
    const center = size / 2;
    const radius = 60;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;

    const colors = [
      '#6366f1', // Indigo
      '#f59e0b', // Amber
      '#10b981', // Emerald
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#8b5cf6', // Violet
      '#ef4444', // Red
      '#14b8a6', // Teal
      '#f43f5e'  // Rose
    ];

    let accumulatedPercentage = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
        {/* The donut circle */}
        <div className="relative w-40 h-40 shrink-0">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            {chartData.map((d, index) => {
              const share = d.amount / total;
              const strokeLength = share * circumference;
              const strokeOffset = circumference - strokeLength + (accumulatedPercentage * circumference);
              accumulatedPercentage -= share;
              const color = colors[index % colors.length];

              return (
                <circle
                  key={d.category}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 cursor-pointer hover:opacity-85"
                />
              );
            })}
          </svg>
          {/* Inner Text Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Segment</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">₹{(total/1000).toFixed(0)}k</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 max-h-[140px] overflow-y-auto w-full scrollbar-thin">
          {rawData.map((d, index) => {
            const share = d.amount / (stats.categoryBreakdown.reduce((sum, item) => sum + item.amount, 0) || 1);
            const color = colors[index % colors.length];
            const isDimmed = categoryFilter && categoryFilter !== d.category;

            return (
              <button
                key={d.category}
                onClick={() => setCategoryFilter(categoryFilter === d.category ? null : d.category)}
                className={`flex items-center justify-between w-full text-left p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all ${isDimmed ? 'opacity-30' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{d.category}</span>
                </div>
                <span className="text-[10px] font-black text-slate-550">{(share * 100).toFixed(0)}%</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // --- SVG 3: Purchase Trend Analysis Bar Chart ---
  const renderBarChart = () => {
    if (trends.length === 0) return null;

    const width = 450;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 10;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...trends.map(t => t.purchase), 10000);
    const barWidth = 24;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * ratio;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <g key={i} className="opacity-10 dark:opacity-5">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[8px] font-bold fill-current">₹{(val/1000).toFixed(0)}k</text>
            </g>
          );
        })}

        {/* Grouped Bars */}
        {trends.map((t, i) => {
          const x = paddingLeft + (i / trends.length) * chartWidth + (chartWidth / trends.length - barWidth) / 2;
          const barHeight = (t.purchase / maxVal) * chartHeight;
          const y = paddingTop + chartHeight - barHeight;

          return (
            <g key={t.month} className="group/bar">
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx="4"
                fill="url(#barGrad)"
                className="fill-indigo-500 hover:fill-lime-400 cursor-pointer transition-all duration-300 shadow-md"
              />
              
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
              </defs>

              {/* Tooltip */}
              <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={x - 20} y={y - 25} width="64" height="16" rx="4" fill="#0f172a" />
                <text x={x + barWidth/2} y={y - 14} textAnchor="middle" fill="#ffffff" className="text-[8px] font-black fill-white">₹{t.purchase.toLocaleString()}</text>
              </g>

              {/* X label */}
              <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" className="text-[8px] font-bold fill-slate-400">{t.month}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  // --- SVG 4: Salary Expense Trend Area Chart ---
  const renderAreaChart = () => {
    if (trends.length === 0) return null;

    const width = 450;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Simulate 3 month projection
    const extendedTrends = [...trends];
    const lastValue = trends[trends.length - 1].salary;
    const lastMonthIdx = new Date().getMonth();
    
    // Add 3 forecast items
    for (let i = 1; i <= 3; i++) {
      const d = new Date(new Date().getFullYear(), lastMonthIdx + i, 1);
      extendedTrends.push({
        month: d.toLocaleString('default', { month: 'short' }) + '*',
        salary: lastValue * (1 + (i * 0.03)), // 3% monthly increase projected
        isForecast: true
      });
    }

    const maxVal = Math.max(...extendedTrends.map(t => t.salary), 10000);

    const points = extendedTrends.map((t, i) => {
      const x = paddingLeft + (i / (extendedTrends.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (t.salary / maxVal) * chartHeight;
      return { x, y, label: t.month, salary: t.salary, isForecast: t.isForecast };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaD = points.length 
      ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z` 
      : "";

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="salaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* X/Y lines */}
        {[0, 0.33, 0.66, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * ratio;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <g key={i} className="opacity-10 dark:opacity-5">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[8px] font-bold fill-current">₹{(val/1000).toFixed(0)}k</text>
            </g>
          );
        })}

        {/* Area */}
        {areaD && <path d={areaD} fill="url(#salaryAreaGrad)" />}

        {/* Line */}
        {pathD && (
          <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_2px_4px_rgba(6,182,212,0.2)]" />
        )}

        {/* Dotted border between actuals and forecast */}
        {points.length > 3 && (
          <line
            x1={points[points.length - 4].x}
            y1={paddingTop}
            x2={points[points.length - 4].x}
            y2={paddingTop + chartHeight}
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
        )}

        {/* Anchors */}
        {points.map((p, i) => (
          <g key={i} className="group/anchor">
            <circle
              cx={p.x}
              cy={p.y}
              r={p.isForecast ? "2.5" : "3.5"}
              fill={p.isForecast ? "#94a3b8" : "#06b6d4"}
              stroke="#ffffff"
              strokeWidth="1"
              className="cursor-pointer"
            />
            {/* Tooltip */}
            <g className="opacity-0 group-hover/anchor:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect x={p.x - 40} y={p.y - 25} width="80" height="16" rx="4" fill="#0f172a" />
              <text x={p.x} y={p.y - 14} textAnchor="middle" fill="#ffffff" className="text-[8px] font-black fill-white">
                {p.isForecast ? 'Proj: ' : ''}₹{(p.salary/1000).toFixed(0)}k
              </text>
            </g>
            {/* X label */}
            <text x={p.x} y={height - 5} textAnchor="middle" className="text-[8px] font-bold fill-slate-400">{p.label}</text>
          </g>
        ))}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. Header & Sync row */}
      <div className="flex justify-between items-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-slate-100">
            Accounting & Payroll <span className="text-indigo-650 dark:text-indigo-400">Dashboard</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            Real-time corporate finances summary console
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-3 bg-indigo-600/5 hover:bg-indigo-600/10 dark:bg-lime-500/5 dark:hover:bg-lime-500/10 border border-indigo-500/10 dark:border-lime-500/10 rounded-2xl text-indigo-600 dark:text-lime-400 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider"
        >
          <RefreshCw size={14} />
          <span>Sync metrics</span>
        </button>
      </div>

      {/* 2. KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <KpiCard
          title="Total Income"
          amount={kpis.income}
          icon={ArrowDownLeft}
          color="indigo"
          subtext="YTD Cumulative Revenue"
        />
        <KpiCard
          title="Total Expenses"
          amount={kpis.expenses}
          icon={ArrowUpRight}
          color="amber"
          percent={`${kpis.expensePercent}%`}
          subtext="Operational spendings"
        />
        <KpiCard
          title="Total Purchases"
          amount={kpis.purchases}
          icon={ShoppingCart}
          color="teal"
          percent={`${kpis.purchasePercent}%`}
          subtext="Procurements and orders"
        />
        <KpiCard
          title="Salary Expenses"
          amount={kpis.salaries}
          icon={Users}
          color="cyan"
          percent={`${kpis.salaryPercent}%`}
          subtext="Staff monthly payrolls"
        />
        <KpiCard
          title="Net Profit"
          amount={kpis.profit}
          icon={TrendingUp}
          color="lime"
          percent={`${kpis.profitMargin}%`}
          subtext="Income minus spendings"
          isProfit={true}
        />
      </div>

      {/* 3. Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Income vs Expense Line */}
        <div className="lg:col-span-7 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[250px]">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Monthly Income vs. Expense
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Period-over-period revenue comparisons</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSeries(prev => ({ ...prev, income: !prev.income }))}
                className={`px-2 py-0.5 border text-[9px] font-black rounded uppercase transition-all ${activeSeries.income ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-600' : 'bg-transparent border-slate-200 text-slate-400'}`}
              >
                Income
              </button>
              <button
                onClick={() => setActiveSeries(prev => ({ ...prev, expense: !prev.expense }))}
                className={`px-2 py-0.5 border text-[9px] font-black rounded uppercase transition-all ${activeSeries.expense ? 'bg-amber-600/10 border-amber-500/20 text-amber-500' : 'bg-transparent border-slate-200 text-slate-400'}`}
              >
                Expense
              </button>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            {renderLineChart()}
          </div>
        </div>

        {/* Category Breakdown Pie */}
        <div className="lg:col-span-5 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[250px]">
          <div className="mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Expense Category Allocation
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Categorized outlays segmentations</p>
          </div>
          <div className="flex-1 w-full flex items-center justify-center">
            {renderDonutChart()}
          </div>
        </div>
      </div>

      {/* 4. Charts Section 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Purchase Trends Bar */}
        <div className="lg:col-span-6 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[250px]">
          <div className="mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Purchase Trend Analysis
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Supply chain and materials procurement history</p>
          </div>
          <div className="flex-1 w-full">
            {renderBarChart()}
          </div>
        </div>

        {/* Salary Projections Area */}
        <div className="lg:col-span-6 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[250px]">
          <div className="mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Salary Expense Trend & Projections
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Rolling payroll costs and 3-month forecast model (*)</p>
          </div>
          <div className="flex-1 w-full">
            {renderAreaChart()}
          </div>
        </div>
      </div>

      {/* 5. Invoices & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Invoices summary details */}
        <div className="lg:col-span-4 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Invoice Summary
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Customer receivables index</p>
          </div>
          
          <div className="space-y-4 my-6">
            <div className="flex justify-between items-center p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-500">Paid Invoices</span>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">₹{kpis.paid?.amount?.toLocaleString() || 0}</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-650 bg-indigo-500/10 rounded">{kpis.paid?.count || 0} Bills</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
              <div>
                <span className="text-[9px] font-black uppercase text-amber-500">Pending Invoices</span>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">₹{kpis.pending?.amount?.toLocaleString() || 0}</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-500/10 rounded">{kpis.pending?.count || 0} Bills</span>
            </div>
          </div>

          <div className="p-3 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                <FileText size={14} />
              </div>
              <span className="text-[9px] font-black uppercase text-slate-400">Aging collections rate (DSO)</span>
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">{stats?.kpis?.dso || '0.0'} Days</span>
          </div>
        </div>

        {/* Activity Log Feed */}
        <div className="lg:col-span-8 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Recent Transaction Feed
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Consolidated financial transaction records log</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={feedFilterType}
                onChange={(e) => setFeedFilterType(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 focus:outline-none"
              >
                <option value="All">All Types</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Purchase">Purchase</option>
                <option value="Salary">Salary</option>
                <option value="Invoice">Invoice</option>
              </select>

              <div className="relative flex-1 sm:w-48">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter feed..."
                  value={feedSearch}
                  onChange={(e) => setFeedSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-[10px] font-medium text-slate-755 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((act) => (
                  <tr key={act.id} className="border-b border-slate-50 dark:border-slate-800/30 last:border-none group">
                    <td className="py-2.5 text-[10px] font-bold text-slate-500">{act.date}</td>
                    <td className="py-2.5 text-[9px] font-black uppercase tracking-wider">
                      <span className={`px-1.5 py-0.5 rounded
                        ${act.type === 'Income' ? 'text-indigo-600 bg-indigo-500/5' : 
                          act.type === 'Expense' ? 'text-amber-600 bg-amber-500/5' : 
                          act.type === 'Purchase' ? 'text-teal-600 bg-teal-500/5' : 
                          act.type === 'Salary' ? 'text-cyan-600 bg-cyan-500/5' : 
                          'text-slate-600 bg-slate-500/5'}`}
                      >
                        {act.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-[10px] font-bold text-slate-800 dark:text-slate-255 group-hover:text-indigo-500 transition-colors">{act.ref}</td>
                    <td className="py-2.5 text-[10px] font-medium text-slate-400 max-w-[200px] truncate">{act.desc}</td>
                    <td className="py-2.5 text-[10px] font-black text-slate-855 dark:text-slate-100 text-right">₹{act.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider
                        ${act.status === 'Paid' ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/10' : 
                          'text-amber-500 bg-amber-500/5 border border-amber-500/10'}`}
                      >
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentActivities.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      No matching records log
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const KpiCard = ({ title, amount, icon: Icon, color, percent, subtext, isProfit }) => {
  const colorMap = {
    indigo: 'text-indigo-600 border-indigo-500/20 bg-indigo-500/5 shadow-indigo-500/5 dark:text-indigo-400',
    amber: 'text-amber-500 border-amber-500/20 bg-amber-500/5 shadow-amber-500/5',
    teal: 'text-teal-600 border-teal-500/20 bg-teal-500/5 shadow-teal-500/5 dark:text-teal-400',
    cyan: 'text-cyan-600 border-cyan-500/20 bg-cyan-500/5 shadow-cyan-500/5 dark:text-cyan-400',
    lime: 'text-lime-500 border-lime-500/20 bg-lime-500/5 shadow-lime-500/5'
  };

  const c = colorMap[color] || colorMap.indigo;
  const showPercent = percent !== undefined && percent !== '0' && percent !== '0%';
  const displayVal = typeof amount === 'number' ? `₹${(amount/1000).toFixed(0)}k` : amount;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      className={`border rounded-[2rem] p-5 shadow-sm transition-all bg-white dark:bg-slate-900/60 flex flex-col justify-between h-[125px]`}
    >
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{title}</span>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1 italic tracking-tight">{displayVal}</h2>
        </div>
        <div className={`p-2.5 rounded-2xl border ${c}`}>
          <Icon size={14} />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {showPercent && (
          <span className={`text-[8.5px] font-black px-1 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wide
            ${isProfit ? 'text-emerald-500 bg-emerald-500/5' : 'text-slate-550 bg-slate-100 dark:bg-slate-800'}`}
          >
            {isProfit && <TrendingUp size={10} />}
            {percent}
          </span>
        )}
        <span className="text-[8px] font-medium text-slate-400 uppercase tracking-tight truncate">{subtext}</span>
      </div>
    </motion.div>
  );
};

export default AccountingDashboard;
