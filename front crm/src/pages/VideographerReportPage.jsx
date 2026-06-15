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

// Default items for Task Log
const DEFAULT_TASK_LOG = [
  { taskProjectName: 'PASS THE BALL VIDEO EDITING', descriptionDetails: 'completed the editing entire pass the ball video fotage', startTime: '9.30am', endTime: '12.30pm', status: 'Done', fileLink: 'kood brand shoots\\9-6-26\\clip\\final\\pass the ball' },
  { taskProjectName: 'CALICUT SCRIPTED VIDEO CONTENT2', descriptionDetails: 'completed the editing entireCONTENT 2 of calicut ad video fotage', startTime: '1.30pm', endTime: '5.00pm', status: 'Done', fileLink: 'kood brand shoots\\calicut shoot\\final\\calicut content 2' },
  { taskProjectName: '', descriptionDetails: '', startTime: '', endTime: '', status: 'N/A', fileLink: '' },
  { taskProjectName: '', descriptionDetails: '', startTime: '', endTime: '', status: 'N/A', fileLink: '' }
];

// Default Key Numbers
const DEFAULT_KEY_NUMBERS = {
  videosCompleted: { target: '2', todaysCount: '2', notes: 'the pass the ball script video sheduled to reshoot after completed the editing' },
  revisionsDone: { target: '', todaysCount: '', notes: '' },
  clientDeliveries: { target: '', todaysCount: '', notes: '' }
};

// Default Blockers
const DEFAULT_BLOCKERS = [
  { issue: 'None', details: '', priority: 'None' }
];

// Default Tomorrow's Plan
const DEFAULT_TOMORROW = [
  { task: 'calicut add footages editing', details: '', notes: '' }
];

const VideographerReportPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isPrivileged, setIsPrivileged] = useState(false);
  
  // Selection state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [videographers, setVideographers] = useState([]);
  const [submittedDates, setSubmittedDates] = useState([]);
  
  // Form State
  const [basicDetails, setBasicDetails] = useState({
    employeeName: '',
    date: '',
    day: '',
    employeeId: '',
    designation: 'Videographer & Editor',
    reportingTo: 'CMO',
    shiftTiming: '9:00 AM - 5:00 PM',
    preparedAt: '5.00PM'
  });
  
  const [taskLog, setTaskLog] = useState(DEFAULT_TASK_LOG);
  const [keyNumbers, setKeyNumbers] = useState(DEFAULT_KEY_NUMBERS);
  const [blockers, setBlockers] = useState(DEFAULT_BLOCKERS);
  const [tomorrowTasks, setTomorrowTasks] = useState(DEFAULT_TOMORROW);
  const [approval, setApproval] = useState({
    videographerName: '',
    videographerSignature: '',
    submittedAt: '',
    teamLeaderName: '',
    approvedOn: ''
  });

  // Fetch token headers helper
  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Initialize user information
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
    } catch (err) {
      console.error("Failed to parse user session details:", err);
    }
  }, []);

  // Fetch videographers list (for selection dropdown)
  useEffect(() => {
    const fetchVideographers = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/videographer-reports/videographers`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setVideographers(data.data);
          
          const savedUser = localStorage.getItem('user');
          let myId = '';
          if (savedUser) {
            const userObj = JSON.parse(savedUser);
            myId = userObj.id || userObj._id;
          }
          
          if (myId && data.data.some(d => d._id === myId)) {
            setSelectedUserId(myId);
          } else if (data.data.length > 0 && !selectedUserId) {
            setSelectedUserId(data.data[0]._id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch videographers list:", e);
      }
    };
    fetchVideographers();
  }, [getAuthHeaders, selectedUserId]);

  // Fetch submitted report dates list for highlighting
  const fetchSubmittedDates = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/videographer-reports/submitted-dates?userId=${userId}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSubmittedDates(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch submitted dates:", e);
    }
  }, [getAuthHeaders]);

  // Trigger submitted dates reload on user selection change
  useEffect(() => {
    if (selectedUserId) {
      fetchSubmittedDates(selectedUserId);
    }
  }, [selectedUserId, fetchSubmittedDates]);

  // Fetch report data for selected date and user
  const fetchReport = useCallback(async (userId, dateStr) => {
    if (!userId || !dateStr) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/videographer-reports/by-date?userId=${userId}&dateString=${dateStr}`, {
        headers: getAuthHeaders()
      });
      
      const data = await res.json();
      
      if (data.success && data.data) {
        const report = data.data;
        setBasicDetails(report.basicDetails || {});
        setTaskLog(report.taskLog || []);
        setKeyNumbers(report.keyNumbers || DEFAULT_KEY_NUMBERS);
        setBlockers(report.blockers || []);
        setTomorrowTasks(report.tomorrowTasks || []);
        setApproval(report.approval || {});
      } else {
        initializeBlankReport(userId, dateStr);
      }
    } catch (err) {
      initializeBlankReport(userId, dateStr);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Load report when selection changes
  useEffect(() => {
    if (selectedUserId && selectedDate) {
      fetchReport(selectedUserId, selectedDate);
    }
  }, [selectedUserId, selectedDate, fetchReport]);

  const initializeBlankReport = (userId, dateStr) => {
    let userDetail = currentUser;
    if (videographers.length > 0) {
      userDetail = videographers.find(d => d._id === userId) || currentUser;
    }

    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDateString = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY

    // Prefill time to current time
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = hours + ':' + minutes + ' ' + ampm;

    setBasicDetails({
      employeeName: userDetail.name || '',
      date: formattedDateString,
      day: dayName.toUpperCase().slice(0,3),
      employeeId: userDetail.employeeId || '',
      designation: 'Videographer & Editor',
      reportingTo: 'CMO',
      shiftTiming: '9:00 AM - 5:00 PM',
      preparedAt: timeStr
    });

    setTaskLog(DEFAULT_TASK_LOG);
    setKeyNumbers(DEFAULT_KEY_NUMBERS);
    setBlockers(DEFAULT_BLOCKERS);
    setTomorrowTasks(DEFAULT_TOMORROW);
    setApproval({
      videographerName: userDetail.name || '',
      videographerSignature: '',
      submittedAt: formattedDateString,
      teamLeaderName: '',
      approvedOn: ''
    });
  };

  // Auto task summary counters
  const getTaskSummaryCounts = () => {
    let done = 0;
    let pending = 0;
    let na = 0;
    
    taskLog.forEach(t => {
      const s = String(t.status || '').toLowerCase().trim();
      if (s === 'done') done++;
      else if (s === 'pending' || s === 'ongoing' || s === 'onprogress') pending++;
      else if (s === 'na' || s === 'n/a') na++;
    });

    return { done, pending, na, total: taskLog.length };
  };
  const counts = getTaskSummaryCounts();

  // Submit report to backend
  const handleSaveReport = async () => {
    try {
      setSaving(true);
      const payload = {
        userId: selectedUserId,
        dateString: selectedDate,
        basicDetails,
        taskLog,
        keyNumbers,
        blockers,
        tomorrowTasks,
        approval
      };

      const res = await fetch(`${API_BASE}/v1/videographer-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Videographer daily report saved successfully!", 'success');
        fetchSubmittedDates(selectedUserId);
      } else {
        showToast(data.message || "Failed to save the report.", 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("Server error. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let currentY = 15;
      
      const drawSectionHeader = (title) => {
        doc.setFillColor(43, 48, 128); // KODBRAND Navy
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), 17, currentY + 5);
        currentY += 7;
      };

      // Header Brand
      doc.setFillColor(43, 48, 128);
      doc.rect(14, 12, 182, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("KODBRAND — Daily Report", 18, 20);

      doc.setFontSize(8);
      doc.text("Videographer & Editor  ·  CMO / Creative & Marketing", 118, 20);

      currentY = 27;

      // 1. BASIC DETAILS
      drawSectionHeader("1. Basic details");
      
      const basicDetailsRows = [
        ["Employee Name", basicDetails.employeeName || '', "Date", basicDetails.date || '', "Day", basicDetails.day || ''],
        ["Employee ID", basicDetails.employeeId || '', "Designation", basicDetails.designation || '', "Reporting to", basicDetails.reportingTo || ''],
        ["Shift timing", basicDetails.shiftTiming || '', "Report prepared at", basicDetails.preparedAt || '', "", ""]
      ];

      autoTable(doc, {
        body: basicDetailsRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 30 },
          1: { width: 31 },
          2: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 30 },
          3: { width: 31 },
          4: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 30 },
          5: { width: 30 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 2. TASK LOG
      drawSectionHeader("2. Task log (one row per task)");
      
      const taskHeaders = [["Task / project name", "Description / details", "Start time", "End time", "Status", "File link (Drive)"]];
      const taskRows = taskLog.map(t => [
        t.taskProjectName || '',
        t.descriptionDetails || '',
        t.startTime || '',
        t.endTime || '',
        t.status || '',
        t.fileLink || ''
      ]);

      // Summary row
      taskRows.push([
        "Daily summary",
        `Done: ${counts.done}   |   Pending: ${counts.pending}   |   N/A: ${counts.na}   |   Total: ${counts.total}`,
        "", "", "", ""
      ]);

      autoTable(doc, {
        head: taskHeaders,
        body: taskRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [43, 48, 128], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 40 },
          1: { width: 62 },
          2: { width: 20 },
          3: { width: 20 },
          4: { width: 18, halign: 'center' },
          5: { width: 22 }
        },
        didParseCell: (data) => {
          if (data.row.index === taskRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 245, 247];
            if (data.column.index === 0) {
              data.cell.styles.textColor = [43, 48, 128];
            }
          }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 3. KEY NUMBERS
      drawSectionHeader("3. Key numbers");
      
      const keyHeaders = [["KPI", "Target", "Today's count", "Notes"]];
      const keyRows = [
        ["Videos completed", keyNumbers.videosCompleted?.target || '', keyNumbers.videosCompleted?.todaysCount || '', keyNumbers.videosCompleted?.notes || ''],
        ["Revisions done", keyNumbers.revisionsDone?.target || '', keyNumbers.revisionsDone?.todaysCount || '', keyNumbers.revisionsDone?.notes || ''],
        ["Client deliveries", keyNumbers.clientDeliveries?.target || '', keyNumbers.clientDeliveries?.todaysCount || '', keyNumbers.clientDeliveries?.notes || '']
      ];

      autoTable(doc, {
        head: keyHeaders,
        body: keyRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [43, 48, 128], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 45, fontStyle: 'bold' },
          1: { width: 40 },
          2: { width: 30, halign: 'center' },
          3: { width: 67 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 4. BLOCKERS & TOMORROW'S PLAN (Combine side by side in table)
      drawSectionHeader("4. Blockers & tomorrow's plan");
      
      const combinedHeaders = [["Blocker / issue", "Details", "Priority", "Tomorrow's main task", "Details", "Notes"]];
      
      const maxLines = Math.max(blockers.length, tomorrowTasks.length);
      const combinedRows = [];
      for (let i = 0; i < maxLines; i++) {
        const b = blockers[i] || {};
        const t = tomorrowTasks[i] || {};
        combinedRows.push([
          b.issue || '',
          b.details || '',
          b.priority || '',
          t.task || '',
          t.details || '',
          t.notes || ''
        ]);
      }

      autoTable(doc, {
        head: combinedHeaders,
        body: combinedRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [43, 48, 128], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.2, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 30 },
          1: { width: 35 },
          2: { width: 16, halign: 'center' },
          3: { width: 30 },
          4: { width: 36 },
          5: { width: 35 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 5. APPROVAL
      drawSectionHeader("5. Approval");
      
      const approvalHeaders = [["Videographer name & sign", "Submitted at", "Team leader", "Approved on"]];
      const approvalRows = [
        [
          `${approval.videographerName || ''} (${approval.videographerSignature || 'Signature'})`,
          approval.submittedAt || '',
          approval.teamLeaderName || '',
          approval.approvedOn || ''
        ]
      ];

      autoTable(doc, {
        head: approvalHeaders,
        body: approvalRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [43, 48, 128], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 52 },
          1: { width: 35, halign: 'center' },
          2: { width: 60 },
          3: { width: 35, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      doc.save(`Daily_Report_Videographer_${approval.videographerName || 'Videographer'}_${selectedDate}.pdf`);
      showToast("PDF report downloaded successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to generate PDF.", "error");
    }
  };

  // Generate last 14 days list
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

  // Helper row handlers for dynamic tables
  const addTaskRow = () => {
    setTaskLog([...taskLog, { taskProjectName: '', descriptionDetails: '', startTime: '', endTime: '', status: 'Done', fileLink: '' }]);
  };
  
  const removeTaskRow = (index) => {
    if (taskLog.length > 1) {
      setTaskLog(taskLog.filter((_, i) => i !== index));
    }
  };

  const addBlockerRow = () => {
    setBlockers([...blockers, { issue: '', details: '', priority: '' }]);
  };

  const removeBlockerRow = (index) => {
    if (blockers.length > 1) {
      setBlockers(blockers.filter((_, i) => i !== index));
    }
  };

  const addTomorrowRow = () => {
    setTomorrowTasks([...tomorrowTasks, { task: '', details: '', notes: '' }]);
  };

  const removeTomorrowRow = (index) => {
    if (tomorrowTasks.length > 1) {
      setTomorrowTasks(tomorrowTasks.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* LEFT PANEL: Date Select Sidebar */}
      <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-5 shadow-sm">
        
        {(isPrivileged || videographers.length > 1) && (
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Videographer User
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
              >
                <option value="">-- Select Videographer --</option>
                {videographers.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.employeeId || 'No ID'})
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

      {/* RIGHT PANEL: Main Report Form */}
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
            {/* Form Header Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Videographer Daily Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill, review, and download daily reports for Videographer & Editor / CMO Office.
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
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="text"
                    value={basicDetails.date || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, date: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Day</label>
                  <input
                    type="text"
                    value={basicDetails.day || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, day: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee ID</label>
                  <input
                    type="text"
                    value={basicDetails.employeeId || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, employeeId: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={basicDetails.designation || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, designation: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Reporting Manager</label>
                  <input
                    type="text"
                    value={basicDetails.reportingTo || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, reportingTo: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Shift Timing</label>
                  <input
                    type="text"
                    value={basicDetails.shiftTiming || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, shiftTiming: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Report Prepared At</label>
                  <input
                    type="text"
                    value={basicDetails.preparedAt || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, preparedAt: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* 2. TASK LOG */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">2</span>
                  Task Log
                </h2>
                <button
                  type="button"
                  onClick={addTaskRow}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[25%]">Task / Project Name</th>
                      <th className="px-5 py-4 w-[35%]">Description / Details</th>
                      <th className="px-5 py-4 w-[10%] text-center">Start Time</th>
                      <th className="px-5 py-4 w-[10%] text-center">End Time</th>
                      <th className="px-5 py-4 w-[10%] text-center">Status</th>
                      <th className="px-5 py-4 w-[15%]">Drive File Link</th>
                      <th className="px-5 py-4 w-[5%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {taskLog.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.taskProjectName}
                            onChange={(e) => {
                              const updated = [...taskLog];
                              updated[index].taskProjectName = e.target.value;
                              setTaskLog(updated);
                            }}
                            placeholder="Design Task..."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <textarea
                            value={item.descriptionDetails}
                            onChange={(e) => {
                              const updated = [...taskLog];
                              updated[index].descriptionDetails = e.target.value;
                              setTaskLog(updated);
                            }}
                            placeholder="Provide design work details..."
                            rows={1}
                            className="w-full bg-transparent border-none focus:outline-none resize-y text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.startTime}
                            onChange={(e) => {
                              const updated = [...taskLog];
                              updated[index].startTime = e.target.value;
                              setTaskLog(updated);
                            }}
                            placeholder="9:30 AM"
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.endTime}
                            onChange={(e) => {
                              const updated = [...taskLog];
                              updated[index].endTime = e.target.value;
                              setTaskLog(updated);
                            }}
                            placeholder="11:00 AM"
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <select
                            value={item.status}
                            onChange={(e) => {
                              const updated = [...taskLog];
                              updated[index].status = e.target.value;
                              setTaskLog(updated);
                            }}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                          >
                            <option value="Done">Done</option>
                            <option value="Pending">Pending</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.fileLink}
                            onChange={(e) => {
                              const updated = [...taskLog];
                              updated[index].fileLink = e.target.value;
                              setTaskLog(updated);
                            }}
                            placeholder="Link to drive..."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200 text-xs text-indigo-600 dark:text-lime-400"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeTaskRow(index)}
                            disabled={taskLog.length === 1}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Auto-Calculated Daily Summary Row */}
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                      <td className="px-5 py-4 text-indigo-600 dark:text-lime-400">Daily Summary</td>
                      <td className="px-5 py-4" colSpan={6}>
                        <div className="flex gap-6 text-xs uppercase tracking-wider">
                          <span>Done: <strong className="text-emerald-500">{counts.done}</strong></span>
                          <span>Pending: <strong className="text-amber-500">{counts.pending}</strong></span>
                          <span>N/A: <strong className="text-slate-400">{counts.na}</strong></span>
                          <span>Total: <strong>{counts.total}</strong></span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. KEY NUMBERS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">3</span>
                Key Numbers
              </h2>
              
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[25%]">KPI</th>
                      <th className="px-5 py-4 w-[25%]">Target</th>
                      <th className="px-5 py-4 w-[15%] text-center">Today's Count</th>
                      <th className="px-5 py-4 w-[35%]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5">
                      <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">Videos Completed</td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={keyNumbers.videosCompleted?.target || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            videosCompleted: { ...keyNumbers.videosCompleted, target: e.target.value }
                          })}
                          placeholder="Target count..."
                          className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="text"
                          value={keyNumbers.videosCompleted?.todaysCount || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            videosCompleted: { ...keyNumbers.videosCompleted, todaysCount: e.target.value }
                          })}
                          placeholder="Actual..."
                          className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={keyNumbers.videosCompleted?.notes || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            videosCompleted: { ...keyNumbers.videosCompleted, notes: e.target.value }
                          })}
                          placeholder="Notes..."
                          className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5">
                      <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">Revisions Done</td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={keyNumbers.revisionsDone?.target || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            revisionsDone: { ...keyNumbers.revisionsDone, target: e.target.value }
                          })}
                          placeholder="Target count..."
                          className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="text"
                          value={keyNumbers.revisionsDone?.todaysCount || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            revisionsDone: { ...keyNumbers.revisionsDone, todaysCount: e.target.value }
                          })}
                          placeholder="Actual..."
                          className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={keyNumbers.revisionsDone?.notes || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            revisionsDone: { ...keyNumbers.revisionsDone, notes: e.target.value }
                          })}
                          placeholder="Notes..."
                          className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5">
                      <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">Client Deliveries</td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={keyNumbers.clientDeliveries?.target || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            clientDeliveries: { ...keyNumbers.clientDeliveries, target: e.target.value }
                          })}
                          placeholder="Target count..."
                          className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="text"
                          value={keyNumbers.clientDeliveries?.todaysCount || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            clientDeliveries: { ...keyNumbers.clientDeliveries, todaysCount: e.target.value }
                          })}
                          placeholder="Actual..."
                          className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={keyNumbers.clientDeliveries?.notes || ''}
                          onChange={(e) => setKeyNumbers({
                            ...keyNumbers,
                            clientDeliveries: { ...keyNumbers.clientDeliveries, notes: e.target.value }
                          })}
                          placeholder="Notes..."
                          className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. BLOCKERS & TOMORROW'S PLAN */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* BLOCKERS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4A</span>
                    Blockers & Issues
                  </h2>
                  <button
                    type="button"
                    onClick={addBlockerRow}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                  >
                    <Plus size={14} /> Add Blocker
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-3 w-[30%]">Blocker / Issue</th>
                        <th className="px-4 py-3 w-[50%]">Details</th>
                        <th className="px-4 py-3 w-[15%] text-center">Priority</th>
                        <th className="px-4 py-3 w-[5%] text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {blockers.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5">
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.issue}
                              onChange={(e) => {
                                const updated = [...blockers];
                                updated[index].issue = e.target.value;
                                setBlockers(updated);
                              }}
                              placeholder="Describe blocker..."
                              className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.details}
                              onChange={(e) => {
                                const updated = [...blockers];
                                updated[index].details = e.target.value;
                                setBlockers(updated);
                              }}
                              placeholder="Details..."
                              className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <select
                              value={item.priority}
                              onChange={(e) => {
                                const updated = [...blockers];
                                updated[index].priority = e.target.value;
                                setBlockers(updated);
                              }}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                            >
                              <option value="None">None</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeBlockerRow(index)}
                              disabled={blockers.length === 1}
                              className="text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TOMORROW'S PLAN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4B</span>
                    Tomorrow's Plan
                  </h2>
                  <button
                    type="button"
                    onClick={addTomorrowRow}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                  >
                    <Plus size={14} /> Add Task
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-3 w-[30%]">Tomorrow's Main Task</th>
                        <th className="px-4 py-3 w-[45%]">Details</th>
                        <th className="px-4 py-3 w-[20%]">Notes</th>
                        <th className="px-4 py-3 w-[5%] text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {tomorrowTasks.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5">
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.task}
                              onChange={(e) => {
                                const updated = [...tomorrowTasks];
                                updated[index].task = e.target.value;
                                setTomorrowTasks(updated);
                              }}
                              placeholder="Tomorrow's plan..."
                              className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.details}
                              onChange={(e) => {
                                const updated = [...tomorrowTasks];
                                updated[index].details = e.target.value;
                                setTomorrowTasks(updated);
                              }}
                              placeholder="Describe task details..."
                              className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => {
                                const updated = [...tomorrowTasks];
                                updated[index].notes = e.target.value;
                                setTomorrowTasks(updated);
                              }}
                              placeholder="Notes..."
                              className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeTomorrowRow(index)}
                              disabled={tomorrowTasks.length === 1}
                              className="text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* 5. APPROVAL DETAILS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">5</span>
                Approval Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Videographer Name</label>
                  <input
                    type="text"
                    value={approval.videographerName || ''}
                    onChange={(e) => setApproval({ ...approval, videographerName: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Videographer Signature (Initials)</label>
                  <input
                    type="text"
                    value={approval.videographerSignature || ''}
                    onChange={(e) => setApproval({ ...approval, videographerSignature: e.target.value })}
                    placeholder="Signature..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Submitted At (Date)</label>
                  <input
                    type="text"
                    value={approval.submittedAt || ''}
                    onChange={(e) => setApproval({ ...approval, submittedAt: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Team Leader Name</label>
                  <input
                    type="text"
                    value={approval.teamLeaderName || ''}
                    onChange={(e) => setApproval({ ...approval, teamLeaderName: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Approved On (Date)</label>
                  <input
                    type="text"
                    value={approval.approvedOn || ''}
                    onChange={(e) => setApproval({ ...approval, approvedOn: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </div>

    </div>
  );
};

export default VideographerReportPage;
