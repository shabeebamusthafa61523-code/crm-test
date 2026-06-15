import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Calendar, Plus, Trash2, Save, Download, 
  CheckCircle, HelpCircle, Loader2, User, ChevronRight 
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_URL;

// Defaults from mockup
const DEFAULT_TASK_SUMMARY = [
  { task: 'Instagram post published', detailsNotes: 'Gangeee poster and software development reel', status: 'Done', remarks: '' },
  { task: 'Stories uploaded', detailsNotes: 'poll poster of world cup 2026 Grp E,F', status: 'Done', remarks: '' },
  { task: 'Client works', detailsNotes: 'ipas post about GST UPDATE 2026 , Bail & Anticipatory Bail', status: 'Done', remarks: '' },
  { task: '', detailsNotes: '', status: 'N/A', remarks: '' },
  { task: '', detailsNotes: '', status: 'N/A', remarks: '' },
  { task: '', detailsNotes: '', status: 'N/A', remarks: '' }
];

const DEFAULT_KPI_TRACKING = [
  { kpi: 'Leads generated', target: '', achievedToday: '', notes: '' },
  { kpi: 'Ad reach', target: '', achievedToday: '', notes: '' },
  { kpi: 'Ad spend (₹)', target: '', achievedToday: '', notes: '' },
  { kpi: 'Engagement rate (%)', target: '', achievedToday: '', notes: '' },
  { kpi: 'Posts published', target: '', achievedToday: 'done', notes: '' },
  { kpi: 'Videos delivered', target: '', achievedToday: 'done', notes: '' }
];

const DEFAULT_BLOCKERS_PLAN = [
  { blockersToday: '', priority: '', tomorrowMainTask: '', notes: '' }
];

const MarketingReportPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isPrivileged, setIsPrivileged] = useState(false);

  // Selection states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [marketingStaff, setMarketingStaff] = useState([]);
  const [submittedDates, setSubmittedDates] = useState([]);

  // Form States
  const [basicDetails, setBasicDetails] = useState({
    employeeName: '',
    employeeId: '',
    designation: 'Digital Marketer',
    reportingTo: 'CMO',
    date: '',
    day: '',
    shiftTiming: '9:00 AM – 6:00 PM',
    preparedTime: ''
  });

  const [taskSummary, setTaskSummary] = useState(DEFAULT_TASK_SUMMARY);
  const [keyNumbers, setKeyNumbers] = useState(DEFAULT_KPI_TRACKING);
  const [blockersTomorrowPlan, setBlockersTomorrowPlan] = useState(DEFAULT_BLOCKERS_PLAN);
  
  const [approval, setApproval] = useState({
    staffSignature: '',
    submittedAt: '',
    leaderApproval: 'CMO / Team Leader Approval',
    approvedOn: ''
  });

  // Get Auth Headers Helper
  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Initialize current user
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        setCurrentUser(userObj);
        
        const role = String(userObj.role_id || userObj.role || '').toLowerCase().trim();
        const privileged = ['1', '2', 'hr', 'admin'].includes(role);
        setIsPrivileged(privileged);
        
        if (!privileged) {
          const uId = userObj.id || userObj._id;
          setSelectedUserId(uId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch Marketing Staff (For Admins)
  useEffect(() => {
    if (isPrivileged) {
      const fetchMarketingStaff = async () => {
        try {
          const res = await fetch(`${API_BASE}/v1/marketing-reports/marketing-staff`, {
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setMarketingStaff(data.data);
            if (data.data.length > 0 && !selectedUserId) {
              setSelectedUserId(data.data[0]._id);
            }
          }
        } catch (e) {
          console.error("Failed to fetch marketing staff list:", e);
        }
      };
      fetchMarketingStaff();
    }
  }, [isPrivileged, getAuthHeaders, selectedUserId]);

  // Fetch submitted dates
  const fetchSubmittedDates = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/marketing-reports/submitted-dates?userId=${userId}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSubmittedDates(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (selectedUserId) {
      fetchSubmittedDates(selectedUserId);
    }
  }, [selectedUserId, fetchSubmittedDates]);

  // Fetch Marketing report data
  const fetchReport = useCallback(async (userId, dateStr) => {
    if (!userId || !dateStr) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/marketing-reports/by-date?userId=${userId}&dateString=${dateStr}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && data.data) {
        const report = data.data;
        setBasicDetails(report.basicDetails || {});
        setTaskSummary(report.taskSummary || []);
        setKeyNumbers(report.keyNumbers || []);
        setBlockersTomorrowPlan(report.blockersTomorrowPlan || []);
        setApproval(report.approval || {});
      } else {
        initializeBlankReport(userId, dateStr);
      }
    } catch (e) {
      initializeBlankReport(userId, dateStr);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (selectedUserId && selectedDate) {
      fetchReport(selectedUserId, selectedDate);
    }
  }, [selectedUserId, selectedDate, fetchReport]);

  const initializeBlankReport = (userId, dateStr) => {
    let userDetail = currentUser;
    if (isPrivileged && marketingStaff.length > 0) {
      userDetail = marketingStaff.find(u => u._id === userId) || currentUser;
    }

    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDateString = dateObj.toLocaleDateString('en-GB').replace(/\//g, '/'); // DD/MM/YYYY

    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    setBasicDetails({
      employeeName: userDetail.name || '',
      employeeId: userDetail.employeeId || '',
      designation: 'Digital Marketer',
      reportingTo: 'CMO',
      date: formattedDateString,
      day: dayName.toLowerCase(),
      shiftTiming: '9:00 AM – 6:00 PM',
      preparedTime: timeStr
    });

    setTaskSummary(DEFAULT_TASK_SUMMARY);
    setKeyNumbers(DEFAULT_KPI_TRACKING);
    setBlockersTomorrowPlan(DEFAULT_BLOCKERS_PLAN);
    setApproval({
      staffSignature: userDetail.name || '',
      submittedAt: timeStr,
      leaderApproval: 'CMO / Team Leader Approval',
      approvedOn: ''
    });
  };

  const handleSaveReport = async () => {
    try {
      setSaving(true);
      const payload = {
        userId: selectedUserId,
        dateString: selectedDate,
        basicDetails,
        taskSummary,
        keyNumbers,
        blockersTomorrowPlan,
        approval
      };

      const res = await fetch(`${API_BASE}/v1/marketing-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Marketing Daily Report saved successfully!", 'success');
        fetchSubmittedDates(selectedUserId);
      } else {
        showToast(data.message || "Failed to save the report.", 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("Server error. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let currentY = 15;

      const drawSectionHeader = (title) => {
        doc.setFillColor(60, 35, 117);
        doc.rect(14, currentY, 182, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), 17, currentY + 4.2);
        currentY += 6;
      };

      const drawHeader = () => {
        // Logo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(132, 204, 22); // Lime Green
        doc.text("KOD.", 14, 21);
        
        doc.setTextColor(60, 35, 117);
        doc.text("brand", 32, 21);

        // Title
        doc.setFontSize(14);
        doc.setTextColor(60, 35, 117);
        doc.text("DAILY REPORT", 146, 16);
        
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text("DIGITAL MARKETER · CMO / CREATIVE & MARKETING", 112, 22);
      };

      drawHeader();
      currentY = 25;

      // 1. BASIC DETAILS
      drawSectionHeader("1. Basic details");
      const basicRows = [
        [
          "Employee name", basicDetails.employeeName || '',
          "Date", basicDetails.date || ''
        ],
        [
          "Employee ID", basicDetails.employeeId || '',
          "Day", basicDetails.day || ''
        ],
        [
          "Designation", basicDetails.designation || '',
          "Shift timing", basicDetails.shiftTiming || ''
        ],
        [
          "Reporting to", basicDetails.reportingTo || '',
          "Report prepared at", basicDetails.preparedTime || ''
        ]
      ];

      autoTable(doc, {
        body: basicRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 35 },
          1: { width: 56 },
          2: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 35 },
          3: { width: 56 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 2. TASK SUMMARY
      drawSectionHeader("2. Task summary");
      const taskHeaders = [["Task", "Details / notes", "Status", "Remarks"]];
      const taskRows = taskSummary.map(t => [t.task || '', t.detailsNotes || '', t.status || '', t.remarks || '']);

      autoTable(doc, {
        head: taskHeaders,
        body: taskRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 45 },
          1: { width: 75 },
          2: { width: 27, halign: 'center' },
          3: { width: 35 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 3. KEY NUMBERS (KPIs)
      drawSectionHeader("3. Key numbers (KPIs)");
      const kpiHeaders = [["KPI", "Target", "Achieved today", "Notes"]];
      const kpiRows = keyNumbers.map(k => [k.kpi || '', k.target || '', k.achievedToday || '', k.notes || '']);

      autoTable(doc, {
        head: kpiHeaders,
        body: kpiRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 45 },
          1: { width: 45, halign: 'center' },
          2: { width: 45, halign: 'center' },
          3: { width: 47 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 4. BLOCKERS & TOMORROW'S PLAN
      drawSectionHeader("4. Blockers & tomorrow's plan");
      const blockersHeaders = [["Any blockers today?", "Priority", "Tomorrow's main task", "Notes"]];
      const blockersRows = blockersTomorrowPlan.map(b => [b.blockersToday || '', b.priority || '', b.tomorrowMainTask || '', b.notes || '']);

      autoTable(doc, {
        head: blockersHeaders,
        body: blockersRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 45 },
          1: { width: 30, halign: 'center' },
          2: { width: 62 },
          3: { width: 45 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 5. APPROVAL
      drawSectionHeader("5. Approval");
      const approvalHeaders = [["Staff signature / name", "Submitted at", "Team leader approval", "Approved on"]];
      const approvalRows = [[
        approval.staffSignature || '',
        approval.submittedAt || '',
        approval.leaderApproval || '',
        approval.approvedOn || ''
      ]];

      autoTable(doc, {
        head: approvalHeaders,
        body: approvalRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 3, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 45 },
          1: { width: 45, halign: 'center' },
          2: { width: 45 },
          3: { width: 47, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      doc.save(`Marketing_Daily_Report_${basicDetails.employeeName || 'Marketer'}_${selectedDate}.pdf`);
      showToast("PDF report downloaded successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to generate PDF.", "error");
    }
  };

  const getRecentDates = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const displayDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      dates.push({ dateString, dayName, displayDate });
    }
    return dates;
  };
  const recentDates = getRecentDates();

  const handleTaskChange = (index, field, value) => {
    const updated = [...taskSummary];
    updated[index][field] = value;
    setTaskSummary(updated);
  };

  const addTaskRow = () => {
    setTaskSummary([
      ...taskSummary,
      { task: '', detailsNotes: '', status: '', remarks: '' }
    ]);
  };

  const removeTaskRow = (index) => {
    const updated = taskSummary.filter((_, idx) => idx !== index);
    setTaskSummary(updated);
  };

  const handleBlockerChange = (index, field, value) => {
    const updated = [...blockersTomorrowPlan];
    updated[index][field] = value;
    setBlockersTomorrowPlan(updated);
  };

  const addBlockerRow = () => {
    setBlockersTomorrowPlan([
      ...blockersTomorrowPlan,
      { blockersToday: '', priority: '', tomorrowMainTask: '', notes: '' }
    ]);
  };

  const removeBlockerRow = (index) => {
    const updated = blockersTomorrowPlan.filter((_, idx) => idx !== index);
    setBlockersTomorrowPlan(updated);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT PANEL: Date Select Sidebar */}
      <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-5 shadow-sm">
        {isPrivileged && (
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Marketing Staff
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {marketingStaff.map(staff => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name} ({staff.employeeId || 'No ID'})
                  </option>
                ))}
              </select>
              <User size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Calendar size={14} className="text-indigo-500 dark:text-lime-400" />
          Shift Report Log (14 Days)
        </h3>

        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
          {recentDates.map(dateObj => {
            const isSelected = selectedDate === dateObj.dateString;
            const isSubmitted = submittedDates.includes(dateObj.dateString);
            
            return (
              <button
                key={dateObj.dateString}
                onClick={() => setSelectedDate(dateObj.dateString)}
                className={`flex items-center justify-between w-52 lg:w-full shrink-0 px-4 py-3 rounded-2xl border text-left transition-all duration-300
                  ${isSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-950/60 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <div className="flex flex-col">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {dateObj.dayName}
                  </span>
                  <span className="text-sm font-bold mt-0.5">
                    {dateObj.displayDate}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {isSubmitted ? (
                    <CheckCircle size={16} className={isSelected ? 'text-lime-400' : 'text-emerald-500'} />
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-300' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  )}
                  <ChevronRight size={14} className="opacity-50" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: Form Details */}
      <div className="flex-1 w-full bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 lg:p-8 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p className="text-sm text-slate-400">Loading daily report...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Marketing Daily Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill, review, and download digital marketer shift reports.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all"
                >
                  <Download size={16} />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={handleSaveReport}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Report
                </button>
              </div>
            </div>

            {/* 1. BASIC DETAILS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">1</span>
                Basic Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee Name</label>
                  <input
                    type="text"
                    value={basicDetails.employeeName || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, employeeName: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee ID</label>
                  <input
                    type="text"
                    value={basicDetails.employeeId || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, employeeId: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={basicDetails.designation || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, designation: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Reporting To</label>
                  <input
                    type="text"
                    value={basicDetails.reportingTo || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, reportingTo: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="text"
                    value={basicDetails.date || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, date: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Day</label>
                  <input
                    type="text"
                    value={basicDetails.day || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, day: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Shift Timing</label>
                  <input
                    type="text"
                    value={basicDetails.shiftTiming || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, shiftTiming: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Report Prepared At</label>
                  <input
                    type="text"
                    value={basicDetails.preparedTime || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, preparedTime: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. TASK SUMMARY */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">2</span>
                  Task Summary
                </h2>
                <button
                  type="button"
                  onClick={addTaskRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-lime-400 dark:hover:text-lime-500 uppercase tracking-wider"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Task</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/2">Details / Notes</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-32">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-3 py-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {taskSummary.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.task || ''}
                            onChange={(e) => handleTaskChange(idx, 'task', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            placeholder="e.g. Stories uploaded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.detailsNotes || ''}
                            onChange={(e) => handleTaskChange(idx, 'detailsNotes', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.status || ''}
                            onChange={(e) => handleTaskChange(idx, 'status', e.target.value)}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => handleTaskChange(idx, 'remarks', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeTaskRow(idx)}
                            className="text-rose-500 hover:text-rose-600 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. KEY NUMBERS (KPIs) */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">3</span>
                Key Numbers (KPIs)
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/4">KPI</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/4">Target</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/4">Achieved Today</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {keyNumbers.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.kpi}</td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.target || ''}
                            onChange={(e) => {
                              const updated = [...keyNumbers];
                              updated[idx].target = e.target.value;
                              setKeyNumbers(updated);
                            }}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.achievedToday || ''}
                            onChange={(e) => {
                              const updated = [...keyNumbers];
                              updated[idx].achievedToday = e.target.value;
                              setKeyNumbers(updated);
                            }}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => {
                              const updated = [...keyNumbers];
                              updated[idx].notes = e.target.value;
                              setKeyNumbers(updated);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. BLOCKERS & TOMORROW'S PLAN */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4</span>
                  Blockers & Tomorrow's Plan
                </h2>
                <button
                  type="button"
                  onClick={addBlockerRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-lime-400 dark:hover:text-lime-500 uppercase tracking-wider"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Any blockers today?</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-36">Priority</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tomorrow's main task</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notes</th>
                      <th className="px-3 py-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {blockersTomorrowPlan.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.blockersToday || ''}
                            onChange={(e) => handleBlockerChange(idx, 'blockersToday', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            placeholder="e.g. None"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.priority || ''}
                            onChange={(e) => handleBlockerChange(idx, 'priority', e.target.value)}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            placeholder="High / Med / Low"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.tomorrowMainTask || ''}
                            onChange={(e) => handleBlockerChange(idx, 'tomorrowMainTask', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleBlockerChange(idx, 'notes', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeBlockerRow(idx)}
                            className="text-rose-500 hover:text-rose-600 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. APPROVAL */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">5</span>
                Approval Sign-Offs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    Staff Verification
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Staff Signature / Name</label>
                    <input
                      type="text"
                      value={approval.staffSignature || ''}
                      onChange={(e) => setApproval({ ...approval, staffSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Submitted At</label>
                    <input
                      type="text"
                      value={approval.submittedAt || ''}
                      onChange={(e) => setApproval({ ...approval, submittedAt: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    Team Leader Approval
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Team Leader Approval Signature</label>
                    <input
                      type="text"
                      value={approval.leaderApproval || ''}
                      onChange={(e) => setApproval({ ...approval, leaderApproval: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                      disabled={!isPrivileged}
                      placeholder={!isPrivileged ? "Restricted to Team Leader/CMO" : "Leader Approval"}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Approved On Date</label>
                    <input
                      type="text"
                      value={approval.approvedOn || ''}
                      onChange={(e) => setApproval({ ...approval, approvedOn: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                      disabled={!isPrivileged}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MarketingReportPage;
