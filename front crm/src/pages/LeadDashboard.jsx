import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Users, Calendar, Clock, BarChart3, AlertOctagon, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Filter, ShieldAlert,
  ChevronRight, Award, PieChart, CheckCircle2, XCircle, Search,
  Briefcase, Phone, Mail, Tag, ChevronLeft
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const API_BASE = "http://localhost:5000/api/v1";

const STATUS_META = {
  'New': { label: 'New', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400', dot: 'bg-blue-500' },
  'Contacted': { label: 'Contacted', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400', dot: 'bg-indigo-500' },
  'Follow Up': { label: 'Follow Up', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400', dot: 'bg-amber-500' },
  'Interested': { label: 'Interested', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400', dot: 'bg-purple-500' },
  'Converted': { label: 'Converted', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
  'Lost': { label: 'Lost', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400', dot: 'bg-rose-500' }
};

const PRIORITY_META = {
  'Low': { label: 'Low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-305' },
  'Medium': { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400' },
  'High': { label: 'High', color: 'bg-rose-100 text-rose-850 dark:bg-rose-950/30 dark:text-rose-400' }
};

const LeadDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, staff, attribution, leads
  
  // Analytics State
  const [summary, setSummary] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [staffPerf, setStaffPerf] = useState([]);
  const [sourcePerf, setSourcePerf] = useState([]);
  const [followupStats, setFollowupStats] = useState(null);

  // Leads List State (For the fourth tab)
  const [leadsList, setLeadsList] = useState([]);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPages, setLeadsPages] = useState(1);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState('all');
  const [leadsLoading, setLeadsLoading] = useState(false);

  const { showToast } = useToast();

  // Load User from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Error reading user profile:", e);
    }
  }, []);

  // Check if user has permission (Must be digital_marketer, admin, or role ID 4 or 2)
  const isMarketer = useMemo(() => {
    if (!user) return false;
    const role = String(user.role || '').toLowerCase().trim();
    const roleId = String(user.role_id || '').trim();
    return role === 'digital_marketer' || roleId === '4' || role === 'admin' || roleId === '2';
  }, [user]);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Fetch all analytics datasets
  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const headers = getAuthHeaders();
      const urls = [
        `${API_BASE}/analytics/summary`,
        `${API_BASE}/analytics/conversion-rate`,
        `${API_BASE}/analytics/staff-performance`,
        `${API_BASE}/analytics/source-performance`,
        `${API_BASE}/analytics/followup-metrics`
      ];

      const [summaryRes, funnelRes, staffRes, sourceRes, followupRes] = await Promise.all(
        urls.map(url => fetch(url, { headers }).then(r => r.json()))
      );

      if (summaryRes.success) setSummary(summaryRes.data);
      if (funnelRes.success) setFunnel(funnelRes.data.funnel || []);
      if (staffRes.success) setStaffPerf(staffRes.data || []);
      if (sourceRes.success) setSourcePerf(sourceRes.data || []);
      if (followupRes.success) setFollowupStats(followupRes.data || null);

      if (isSilent) {
        showToast('Dashboard metrics updated successfully.', 'success');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      showToast('Error communicating with analytics server.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders, showToast]);

  // Fetch leads list specifically for the Leads Directory Tab
  const fetchLeadsList = useCallback(async () => {
    try {
      setLeadsLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('page', leadsPage);
      queryParams.append('limit', 10);
      if (leadsSearch) queryParams.append('search', leadsSearch);
      if (leadsStatusFilter !== 'all') queryParams.append('status', leadsStatusFilter);

      const res = await fetch(`${API_BASE}/leads?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setLeadsList(data.data);
        if (data.pagination) {
          setLeadsPages(data.pagination.pages || 1);
          setLeadsTotal(data.pagination.total || 0);
        }
      } else if (Array.isArray(data)) {
        setLeadsList(data);
      }
    } catch (error) {
      console.error('Failed to fetch leads list for dashboard:', error);
    } finally {
      setLeadsLoading(false);
    }
  }, [leadsPage, leadsSearch, leadsStatusFilter, getAuthHeaders]);

  useEffect(() => {
    if (user && isMarketer) {
      fetchAnalytics();
    }
  }, [user, isMarketer, fetchAnalytics]);

  // Load leads list when leads tab becomes active or its query params change
  useEffect(() => {
    if (user && isMarketer && activeTab === 'leads') {
      fetchLeadsList();
    }
  }, [user, isMarketer, activeTab, fetchLeadsList]);

  // Access Denied View
  if (user && !isMarketer) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-slate-800 dark:text-slate-100">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-md"
        >
          <div className="mx-auto w-16 h-16 bg-red-500/10 dark:bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6">
            <ShieldAlert size={36} />
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white mb-2">
            Access <span className="text-red-500">Restricted</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            This Lead Management Analytics Dashboard is reserved exclusively for the <strong>Digital Marketing Team</strong>. Your current role does not have authorization to view this data.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95"
          >
            Return to Command Center
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-950/20">
        <RefreshCw className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black">Loading Lead Intelligence Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-16">
      {/* Dashboard Title & Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-2xl shadow-inner">
            <BarChart3 size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider rounded-md">
                Digital Marketing Department
              </span>
              <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse" />
              <span className="text-[9px] text-lime-500 font-bold uppercase tracking-wider">Live feeds</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black italic tracking-tight uppercase bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mt-0.5">
              Lead Analytics <span className="text-indigo-500">Dashboard</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-center">
          <button
            onClick={() => {
              fetchAnalytics(true);
              if (activeTab === 'leads') fetchLeadsList();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Sync Feeds
          </button>
          <button
            onClick={() => window.location.href = '/leads'}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            Manage Directory
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Card 1: Total Leads */}
          <KpiCard
            title="Total Leads"
            value={summary.totalLeads?.value || 0}
            subtitle={`MTD: ${summary.totalLeads?.mtdValue || 0}`}
            trendValue={`${summary.totalLeads?.trend >= 0 ? '+' : ''}${summary.totalLeads?.trend || 0}%`}
            trendType={summary.totalLeads?.trend >= 0 ? 'up' : 'down'}
            themeColor="indigo"
          />
          {/* Card 2: New Leads */}
          <KpiCard
            title="New Leads (24h)"
            value={summary.newLeads?.value || 0}
            subtitle="Leads acquired today"
            trendValue={`${summary.newLeads?.trend >= 0 ? '+' : ''}${summary.newLeads?.trend || 0}%`}
            trendType={summary.newLeads?.trend >= 0 ? 'up' : 'down'}
            themeColor="cyan"
          />
          {/* Card 3: Pending Follow-Ups */}
          <KpiCard
            title="Pending Follow-Ups"
            value={summary.followUpsPending?.value || 0}
            subtitle="Requires immediate call"
            trendType="neutral"
            themeColor="amber"
          />
          {/* Card 4: Converted Leads */}
          <KpiCard
            title="Converted Leads"
            value={summary.convertedLeads?.value || 0}
            subtitle={`Rate: ${summary.convertedLeads?.rate || 0}%`}
            trendType="success"
            themeColor="emerald"
          />
          {/* Card 5: Lost Leads */}
          <KpiCard
            title="Lost Leads"
            value={summary.lostLeads?.value || 0}
            subtitle="Leads closed / unqualified"
            trendType="rose"
            themeColor="rose"
          />
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px">
        {[
          { id: 'overview', label: 'Conversion Funnel', icon: BarChart3 },
          { id: 'staff', label: 'Representative Performance', icon: Users },
          { id: 'attribution', label: 'Channel Attribution', icon: PieChart },
          { id: 'leads', label: 'Leads Directory', icon: TrendingUp }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Tabs Wrapper */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual conversion funnel */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    Customer Conversion Funnel
                  </h3>
                  
                  {funnel.length === 0 ? (
                    <div className="py-20 text-center text-slate-400">No leads funnel data computed yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {funnel.map((item, index) => {
                        const width = 100 - (index * 12); // funnel shape scaling
                        return (
                          <div key={item.stage} className="relative group">
                            {/* Funnel Stage Row */}
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 px-2">
                              <span>{item.stage}</span>
                              <span className="font-mono text-slate-800 dark:text-white">
                                {item.count} leads ({item.percentage}%)
                              </span>
                            </div>

                            {/* Funnel Bar representation */}
                            <div className="w-full bg-slate-100 dark:bg-slate-950 h-10 rounded-xl overflow-hidden relative border border-slate-200/30 dark:border-slate-800/50">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${width}%` }}
                                transition={{ duration: 0.8, delay: index * 0.1 }}
                                className={`h-full flex items-center pl-4 font-black text-[10px] text-white uppercase tracking-wider rounded-xl ${
                                  item.stage === 'Converted' ? 'bg-gradient-to-r from-emerald-600 to-lime-500' :
                                  item.stage === 'Lost' ? 'bg-gradient-to-r from-rose-600 to-orange-500' :
                                  'bg-gradient-to-r from-indigo-600 to-purple-500'
                                }`}
                              >
                                {item.stage === 'Converted' ? '⭐ CONVERTED' : item.stage}
                              </motion.div>

                              {/* Drop off indication overlay */}
                              {index > 0 && funnel[index-1].count > 0 && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                                  -{Math.round(((funnel[index-1].count - item.count) / funnel[index-1].count) * 100)}% drop
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Lost reason category breakdown & follow-up stats */}
                <div className="space-y-8">
                  {summary && summary.lostLeads?.reasons && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-rose-500 rounded-full" />
                        Lost Reason Breakdown
                      </h3>
                      <div className="space-y-3">
                        {summary.lostLeads.reasons.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400">No lost reasons recorded yet.</div>
                        ) : (
                          summary.lostLeads.reasons.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900/50">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{item.reason}</span>
                              <span className="text-xs font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full font-mono">
                                {item.count} leads
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Followup logs activity timeline summary */}
                  {followupStats && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
                        Interaction Logs (Past 7d)
                      </h3>
                      
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-semibold">Total Followups Logged:</span>
                        <span className="text-xs font-black text-indigo-500 font-mono">{followupStats.totalLogsCount || 0} logs</span>
                      </div>

                      {/* Micro line chart / timeline visualization */}
                      <div className="flex items-end justify-between h-20 pt-4 px-2 border-b border-slate-200 dark:border-slate-800">
                        {followupStats.weeklyTimeline && followupStats.weeklyTimeline.length > 0 ? (
                          followupStats.weeklyTimeline.map((item, idx) => {
                            const max = Math.max(...followupStats.weeklyTimeline.map(i => i.count), 1);
                            const heightPercentage = Math.round((item.count / max) * 100);
                            return (
                              <div key={idx} className="flex flex-col items-center flex-1 group relative">
                                {/* Tooltip popover on hover */}
                                <div className="absolute bottom-[110%] opacity-0 group-hover:opacity-100 bg-slate-850 text-white dark:bg-white dark:text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded shadow transition duration-150 pointer-events-none whitespace-nowrap">
                                  {item.count} interactions
                                </div>
                                <div 
                                  style={{ height: `${heightPercentage}%` }}
                                  className="w-4 bg-indigo-500/60 group-hover:bg-indigo-500 rounded-t-sm transition-all duration-300 min-h-[4px]"
                                />
                                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 rotate-45 transform origin-top-left whitespace-nowrap">
                                  {item.date.slice(5)}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="w-full text-center py-6 text-xs text-slate-400">No recent weekly follow-ups found.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'staff' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    Representative Conversion Leaderboard
                  </h3>
                  <Award className="text-indigo-500" size={20} />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Representative</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Assigned</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Converted Leads</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Lost Leads</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversion Rate</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Efficiency Badge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {staffPerf.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-slate-400">No representative data found.</td>
                        </tr>
                      ) : (
                        staffPerf.map((staff, idx) => (
                          <tr key={staff._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition duration-150">
                            {/* Representative Profile */}
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 font-black text-sm flex items-center justify-center border border-indigo-500/10">
                                {staff.name ? staff.name.charAt(0).toUpperCase() : '👤'}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-880 dark:text-slate-200 block">{staff.name}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{staff.email}</span>
                              </div>
                            </td>
                            {/* Assigned Leads Count */}
                            <td className="px-6 py-4 text-xs font-mono text-slate-700 dark:text-slate-300">{staff.totalAssigned}</td>
                            {/* Converted Leads Count */}
                            <td className="px-6 py-4 text-xs font-mono text-emerald-500 font-bold">{staff.convertedCount}</td>
                            {/* Lost Leads Count */}
                            <td className="px-6 py-4 text-xs font-mono text-rose-500">{staff.lostCount}</td>
                            {/* Conversion Rate */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-black text-slate-850 dark:text-white">{Math.round(staff.conversionRate)}%</span>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${Math.min(100, staff.conversionRate)}%` }} 
                                    className="h-full bg-indigo-500 rounded-full"
                                  />
                                </div>
                              </div>
                            </td>
                            {/* Efficiency Badge */}
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                staff.conversionRate >= 60 
                                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20' 
                                  : staff.conversionRate >= 30 
                                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' 
                                    : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                              }`}>
                                {staff.conversionRate >= 60 ? '🔥 Elite Converter' : staff.conversionRate >= 30 ? '📈 Steady Growth' : '⚡ Developing'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'attribution' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Horizontal bars representation of source attribution */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    Channel Acquisition (Leads Volume)
                  </h3>

                  {sourcePerf.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">No attribution records computed.</div>
                  ) : (
                    <div className="space-y-5">
                      {sourcePerf.map((source, index) => {
                        const max = Math.max(...sourcePerf.map(s => s.totalLeads), 1);
                        const widthPercentage = Math.round((source.totalLeads / max) * 100);
                        return (
                          <div key={source.source} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                              <span className="capitalize">{source.source}</span>
                              <span className="font-mono text-slate-850 dark:text-white">{source.totalLeads} leads</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${widthPercentage}%` }}
                                transition={{ duration: 0.8 }}
                                className="h-full bg-indigo-500 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Conversion Rate per Acquisition source channel */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    Source Conversion Rates
                  </h3>

                  {sourcePerf.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">No source attribution rate computed.</div>
                  ) : (
                    <div className="space-y-5">
                      {sourcePerf.map((source, index) => (
                        <div key={source.source} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-900/50">
                          <div>
                            <span className="text-xs font-black capitalize text-slate-800 dark:text-white">{source.source}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5 font-bold">Total: {source.totalLeads} | Converted: {source.convertedCount}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-sm font-mono font-black text-emerald-500 block">{Math.round(source.conversionRate)}%</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Rate</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'leads' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm space-y-6">
                {/* Search & Filter Header Row */}
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 self-start sm:self-center">
                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    All Leads Directory Details ({leadsTotal})
                  </h3>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search Field */}
                    <div className="relative flex-1 sm:w-60">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search Leads..."
                        value={leadsSearch}
                        onChange={(e) => {
                          setLeadsSearch(e.target.value);
                          setLeadsPage(1); // Reset page on new query
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    {/* Status Dropdown Filter */}
                    <select
                      value={leadsStatusFilter}
                      onChange={(e) => {
                        setLeadsStatusFilter(e.target.value);
                        setLeadsPage(1); // Reset page on new query
                      }}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Follow Up">Follow Up</option>
                      <option value="Interested">Interested</option>
                      <option value="Converted">Converted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>

                {/* Table details */}
                {leadsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <RefreshCw className="animate-spin text-indigo-500 mb-4" size={30} />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Loading directory listings...</p>
                  </div>
                ) : leadsList.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400">No matching lead records found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Info</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Details</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Context</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">City / Place</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Created</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {leadsList.map((lead) => {
                          const statusMeta = STATUS_META[lead.status] || { label: lead.status, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
                          const priorityMeta = PRIORITY_META[lead.priority] || { label: lead.priority, color: 'bg-slate-100 text-slate-600' };

                          return (
                            <tr key={lead.id || lead._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition duration-150">
                              {/* Lead Info */}
                              <td className="px-6 py-4">
                                <div className="font-bold text-xs text-slate-850 dark:text-white flex items-center gap-1.5">
                                  {lead.leadName}
                                  <span className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase ${priorityMeta.color}`}>
                                    {priorityMeta.label}
                                  </span>
                                </div>
                                {lead.companyName && (
                                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <Briefcase size={10} />
                                    {lead.companyName}
                                  </div>
                                )}
                              </td>

                              {/* Contact Info */}
                              <td className="px-6 py-4 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                  <Phone size={11} className="text-slate-450" />
                                  {lead.phone}
                                </div>
                                {lead.email && (
                                  <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                                    <Mail size={11} className="text-slate-450" />
                                    {lead.email}
                                  </div>
                                )}
                              </td>

                              {/* Service Info */}
                              <td className="px-6 py-4 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                  <Tag size={11} className="text-slate-450" />
                                  {lead.interestedService || 'Generic Service'}
                                </div>
                                {lead.source && (
                                  <div className="text-[9px] text-indigo-500 font-black mt-1 uppercase tracking-wider">
                                    {lead.source}
                                  </div>
                                )}
                              </td>

                              {/* City */}
                              <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                {lead.city || <span className="text-[10px] text-slate-400 italic">Not Specified</span>}
                              </td>

                              {/* Created Date */}
                              <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {lead.createdAt
                                  ? new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : '—'
                                }
                              </td>

                              {/* Status Badges */}
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black ${statusMeta.color}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                                  {statusMeta.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Pagination Bar */}
                    {leadsPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 px-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                          Showing Page {leadsPage} of {leadsPages}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLeadsPage(prev => Math.max(1, prev - 1))}
                            disabled={leadsPage === 1}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg disabled:opacity-50 transition cursor-pointer"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={() => setLeadsPage(prev => Math.min(leadsPages, prev + 1))}
                            disabled={leadsPage === leadsPages}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg disabled:opacity-50 transition cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Generic KPI Card Component
const KpiCard = ({ title, value, subtitle, trendValue, trendType, themeColor }) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-500 dark:text-indigo-400',
      border: 'border-indigo-500/20'
    },
    cyan: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      text: 'text-cyan-500 dark:text-cyan-400',
      border: 'border-cyan-500/20'
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-500 dark:text-amber-400',
      border: 'border-amber-500/20'
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-500 dark:text-emerald-400',
      border: 'border-emerald-500/20'
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-500 dark:text-rose-400',
      border: 'border-rose-500/20'
    }
  };

  const scheme = colorMap[themeColor] || colorMap.indigo;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/50 p-5 rounded-[2rem] relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
      {/* Visual background edge indicator */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${scheme.bg}`} />
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">{title}</span>
          
          {/* Trend Indicator Icon */}
          {trendType === 'up' && (
            <span className="flex items-center text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md">
              <ArrowUpRight size={10} className="mr-0.5" />
              {trendValue}
            </span>
          )}
          {trendType === 'down' && (
            <span className="flex items-center text-[9px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded-md">
              <ArrowDownRight size={10} className="mr-0.5" />
              {trendValue}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white leading-none">
            {value}
          </h3>
        </div>

        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">
          {subtitle}
        </span>
      </div>
    </div>
  );
};

export default LeadDashboard;
