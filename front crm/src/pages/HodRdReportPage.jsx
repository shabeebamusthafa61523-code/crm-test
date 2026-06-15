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

// Default items for Daily Task Summary
const DEFAULT_TASK_SUMMARY = [
  { activity: 'Website Development', status: 'Done', remarks: '' },
  { activity: 'CRM Software', status: 'Done', remarks: '' },
  { activity: 'Testing/Bug Fixing', status: 'Done', remarks: '' },
  { activity: 'UI/UX Imprvments', status: 'NA', remarks: '' },
  { activity: 'Client Revision Work', status: 'NA', remarks: '' }
];

// Default items for Development Work Report
const DEFAULT_DEV_REPORT = [
  { project: 'Ayurvedic website', activity: 'Changes in the ui and deployment', status: 'Done', remark: 'Client verified' },
  { project: 'CRM', activity: 'Debuging', status: 'onprogress', remark: '' }
];

// Default items for KPI Tracking
const DEFAULT_KPI_TRACKING = [
  { project: 'Ayurvedic website', kpi: 'Changes in ui', target: 'Complete', achieved: 'Done' },
  { project: 'Ayurvedic website', kpi: 'Deployed in Domain and verified', target: 'Complete', achieved: 'Done' },
  { project: 'CRM', kpi: '-Debugging\n-updated todo\n-deployed in test', target: 'Excelimport', achieved: 'Done' }
];

// Default items for Issues/Support Required
const DEFAULT_ISSUES = [
  { issue: 'HR / Admin Manager', priority: '', actionTaken: '' },
  { issue: 'COO / Executive Director', priority: '', actionTaken: '' }
];

const HodRdReportPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isPrivileged, setIsPrivileged] = useState(false);
  
  // Selection state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [hods, setHods] = useState([]);
  const [submittedDates, setSubmittedDates] = useState([]);
  
  // Form State
  const [basicDetails, setBasicDetails] = useState({
    date: '',
    day: '',
    employeeName: '',
    employeeId: '',
    department: 'R&D/ Development',
    designation: 'HOD-R&D Software & Web Developer',
    shiftTiming: '9:00 AM - 5:00 PM',
    reportingTo: 'Manager - OPS Creative & Marketing',
    preparedTime: ''
  });
  
  const [dailyTaskSummary, setDailyTaskSummary] = useState(DEFAULT_TASK_SUMMARY);
  const [developmentWorkReport, setDevelopmentWorkReport] = useState(DEFAULT_DEV_REPORT);
  const [rdInnovationReport, setRdInnovationReport] = useState([{ activity: '', details: '', status: '' }]);
  const [kpiTracking, setKpiTracking] = useState(DEFAULT_KPI_TRACKING);
  const [issuesSupportRequired, setIssuesSupportRequired] = useState(DEFAULT_ISSUES);
  const [nextDayPlanning, setNextDayPlanning] = useState('');
  const [hodComments, setHodComments] = useState('');
  const [approval, setApproval] = useState({
    hodName: 'HOD - R&D /Developer',
    hodSignature: '',
    hodDate: '',
    managerName: 'Manager - OPS Creative &Marketing',
    managerSignature: '',
    managerDate: ''
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
        
        // If not privileged, they can only view/create their own reports
        if (!privileged) {
          const uId = userObj.id || userObj._id;
          setSelectedUserId(uId);
        }
      }
    } catch (err) {
      console.error("Failed to parse user session details:", err);
    }
  }, []);

  // Fetch HODs list (for HR/Admins)
  useEffect(() => {
    if (isPrivileged) {
      const fetchHods = async () => {
        try {
          const res = await fetch(`${API_BASE}/v1/hod-rd-reports/hods`, {
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setHods(data.data);
            if (data.data.length > 0 && !selectedUserId) {
              setSelectedUserId(data.data[0]._id);
            }
          }
        } catch (e) {
          console.error("Failed to fetch HODs list:", e);
        }
      };
      fetchHods();
    }
  }, [isPrivileged, getAuthHeaders, selectedUserId]);

  // Fetch submitted report dates list for highlighting
  const fetchSubmittedDates = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/hod-rd-reports/submitted-dates?userId=${userId}`, {
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
      const res = await fetch(`${API_BASE}/v1/hod-rd-reports/by-date?userId=${userId}&dateString=${dateStr}`, {
        headers: getAuthHeaders()
      });
      
      const data = await res.json();
      
      if (data.success && data.data) {
        const report = data.data;
        setBasicDetails(report.basicDetails || {});
        setDailyTaskSummary(report.dailyTaskSummary || []);
        setDevelopmentWorkReport(report.developmentWorkReport || []);
        setRdInnovationReport(report.rdInnovationReport || []);
        setKpiTracking(report.kpiTracking || []);
        setIssuesSupportRequired(report.issuesSupportRequired || []);
        setNextDayPlanning(report.nextDayPlanning || '');
        setHodComments(report.hodComments || '');
        setApproval(report.approval || {});
      } else {
        // Initialize default blank report
        initializeBlankReport(userId, dateStr);
      }
    } catch (err) {
      // In case of 404 or other errors, fallback to initializing default blank report
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
    if (isPrivileged && hods.length > 0) {
      userDetail = hods.find(d => d._id === userId) || currentUser;
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
      date: formattedDateString,
      day: dayName,
      employeeName: userDetail.name || '',
      employeeId: userDetail.employeeId || '',
      department: 'R&D/ Development',
      designation: userDetail.designation || 'HOD-R&D Software & Web Developer',
      shiftTiming: '9:00 AM - 5:00 PM',
      reportingTo: 'Manager - OPS Creative & Marketing',
      preparedTime: timeStr
    });

    setDailyTaskSummary(DEFAULT_TASK_SUMMARY);
    setDevelopmentWorkReport(DEFAULT_DEV_REPORT);
    setRdInnovationReport([{ activity: '', details: '', status: '' }]);
    setKpiTracking(DEFAULT_KPI_TRACKING);
    setIssuesSupportRequired(DEFAULT_ISSUES);
    setNextDayPlanning('CRM Continues');
    setHodComments('');
    setApproval({
      hodName: 'HOD - R&D /Developer',
      hodSignature: '',
      hodDate: formattedDateString,
      managerName: 'Manager - OPS Creative &Marketing',
      managerSignature: '',
      managerDate: ''
    });
  };

  // Submit report to backend
  const handleSaveReport = async () => {
    try {
      setSaving(true);
      const payload = {
        userId: selectedUserId,
        dateString: selectedDate,
        basicDetails,
        dailyTaskSummary,
        developmentWorkReport,
        rdInnovationReport,
        kpiTracking,
        issuesSupportRequired,
        nextDayPlanning,
        hodComments,
        approval
      };

      const res = await fetch(`${API_BASE}/v1/hod-rd-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("HOD R&D Shift Report saved successfully!", 'success');
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
        doc.setFillColor(60, 35, 117); // rgb(60, 35, 117) - deep purple/indigo
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), 17, currentY + 5);
        currentY += 7;
      };

      // Header Brand Logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(132, 204, 22); // lime green
      doc.text("KOD.", 14, 21);
      
      doc.setTextColor(60, 35, 117); // purple/indigo
      doc.text("brand", 34, 21);

      // Document Title & Designation
      doc.setFontSize(15);
      doc.setTextColor(60, 35, 117);
      doc.text("DAILY SHIFT REPORT", 140, 16);
      
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text("HOD - R&D / SOFTWARE &WEB DEVELOPER", 116, 22);

      currentY = 27;

      // 1. BASIC DETAILS
      drawSectionHeader("1. BASIC DETAILS");
      
      const basicDetailsRows = [
        ["Date", basicDetails.date || ''],
        ["Day", basicDetails.day || ''],
        ["Employee Name:", basicDetails.employeeName || ''],
        ["Employee ID", basicDetails.employeeId || ''],
        ["Department", basicDetails.department || ''],
        ["Designation", basicDetails.designation || ''],
        ["Shift Timing", basicDetails.shiftTiming || ''],
        ["Reporting To", basicDetails.reportingTo || ''],
        ["Prepared Time", basicDetails.preparedTime || '']
      ];

      autoTable(doc, {
        body: basicDetailsRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 45 },
          1: { width: 137 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 2. DAILY TASK SUMMARY
      drawSectionHeader("2. DAILY TASK SUMMARY");
      
      const summaryHeaders = [["Activity", "Status", "Remarks"]];
      const summaryRows = dailyTaskSummary.map(t => [
        t.activity || '',
        t.status || '',
        t.remarks || ''
      ]);

      autoTable(doc, {
        head: summaryHeaders,
        body: summaryRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 70 },
          1: { width: 35, halign: 'center' },
          2: { width: 77 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 3. DEVELOPMENT WORK REPORT
      drawSectionHeader("3. DEVELOPMENT WORK REPORT");
      
      const devHeaders = [["Project", "Development Activity", "Status", "Remark"]];
      const devRows = developmentWorkReport.map(t => [
        t.project || '',
        t.activity || '',
        t.status || '',
        t.remark || ''
      ]);

      autoTable(doc, {
        head: devHeaders,
        body: devRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 35 },
          1: { width: 75 },
          2: { width: 35, halign: 'center' },
          3: { width: 37 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 4. R&D INNOVATION REPORT
      drawSectionHeader("4. R&D INNOVATION REPORT");
      
      const innovHeaders = [["Activity", "Details", "Status"]];
      const innovRows = rdInnovationReport.map(t => [
        t.activity || '',
        t.details || '',
        t.status || ''
      ]);

      autoTable(doc, {
        head: innovHeaders,
        body: innovRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 55 },
          1: { width: 92 },
          2: { width: 35, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 5. KPI TRACKING
      drawSectionHeader("5. KPI TRACKING");
      
      const kpiHeaders = [["Project", "KPI", "TARGET", "ACHEIVED"]];
      const kpiRows = kpiTracking.map(t => [
        t.project || '',
        t.kpi || '',
        t.target || '',
        t.achieved || ''
      ]);

      autoTable(doc, {
        head: kpiHeaders,
        body: kpiRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 35 },
          1: { width: 75 },
          2: { width: 37 },
          3: { width: 35, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      // Page break to start Page 2 fresh
      doc.addPage();
      currentY = 15;

      // 6. ISSUES / SUPPORT REQUIRED
      drawSectionHeader("6. ISSUES /SUPPORT REQUIRED");
      
      const issueHeaders = [["ISSUE", "PRIORITY", "ACTION TAKEN"]];
      const issueRows = issuesSupportRequired.map(t => [
        t.issue || '',
        t.priority || '',
        t.actionTaken || ''
      ]);

      autoTable(doc, {
        head: issueHeaders,
        body: issueRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 70 },
          1: { width: 35, halign: 'center' },
          2: { width: 77 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 7. NEXT DAY PLANNING
      drawSectionHeader("7. NEXT DAY PLANNING");
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const planLines = doc.splitTextToSize(nextDayPlanning || '', 178);
      doc.text(planLines, 16, currentY + 5);
      const planBoxHeight = Math.max(12, planLines.length * 4.2 + 5);
      doc.setDrawColor(180, 180, 180);
      doc.rect(14, currentY, 182, planBoxHeight);
      currentY += planBoxHeight + 4;

      // 8. HOD COMMENTS
      drawSectionHeader("8. HOD COMMENTS");
      const commentsLines = doc.splitTextToSize(hodComments || '', 178);
      doc.text(commentsLines, 16, currentY + 5);
      const commentsBoxHeight = Math.max(12, commentsLines.length * 4.2 + 5);
      doc.rect(14, currentY, 182, commentsBoxHeight);
      currentY += commentsBoxHeight + 4;

      // 9. APPROVAL
      drawSectionHeader("9. APPROVAL");
      const approvalHeaders = [["Name", "Signature", "Date"]];
      const approvalRows = [
        [
          `HOD - R&D /Developer: ${approval.hodName || ''}`,
          approval.hodSignature || '',
          approval.hodDate || ''
        ],
        [
          `Manager – OPS Creative &Marketing: ${approval.managerName || ''}`,
          approval.managerSignature || '',
          approval.managerDate || ''
        ]
      ];

      autoTable(doc, {
        head: approvalHeaders,
        body: approvalRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 75, fontStyle: 'bold' },
          1: { width: 55 },
          2: { width: 52 }
        },
        margin: { left: 14, right: 14 }
      });

      doc.save(`Daily_Shift_Report_HOD_RD_${basicDetails.employeeName || 'HOD'}_${selectedDate}.pdf`);
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
  const addSummaryRow = () => {
    setDailyTaskSummary([...dailyTaskSummary, { activity: '', status: 'Done', remarks: '' }]);
  };
  
  const removeSummaryRow = (index) => {
    if (dailyTaskSummary.length > 1) {
      setDailyTaskSummary(dailyTaskSummary.filter((_, i) => i !== index));
    }
  };

  const addDevRow = () => {
    setDevelopmentWorkReport([...developmentWorkReport, { project: '', activity: '', status: 'ongoing', remark: '' }]);
  };

  const removeDevRow = (index) => {
    if (developmentWorkReport.length > 1) {
      setDevelopmentWorkReport(developmentWorkReport.filter((_, i) => i !== index));
    }
  };

  const addInnovRow = () => {
    setRdInnovationReport([...rdInnovationReport, { activity: '', details: '', status: '' }]);
  };

  const removeInnovRow = (index) => {
    if (rdInnovationReport.length > 1) {
      setRdInnovationReport(rdInnovationReport.filter((_, i) => i !== index));
    }
  };

  const addKpiRow = () => {
    setKpiTracking([...kpiTracking, { project: '', kpi: '', target: '', achieved: '' }]);
  };

  const removeKpiRow = (index) => {
    if (kpiTracking.length > 1) {
      setKpiTracking(kpiTracking.filter((_, i) => i !== index));
    }
  };

  const addIssueRow = () => {
    setIssuesSupportRequired([...issuesSupportRequired, { issue: '', priority: '', actionTaken: '' }]);
  };

  const removeIssueRow = (index) => {
    if (issuesSupportRequired.length > 1) {
      setIssuesSupportRequired(issuesSupportRequired.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* LEFT PANEL: Date Select Sidebar */}
      <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-5 shadow-sm">
        
        {isPrivileged && (
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select HOD User
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
              >
                <option value="">-- Select HOD --</option>
                {hods.map(h => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.employeeId || 'No ID'})
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
                  HOD R&D Daily Shift Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill, review, and download daily reports for Software & Web Development R&D.
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee Name</label>
                  <input
                    type="text"
                    value={basicDetails.employeeName || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, employeeName: e.target.value })}
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                  <input
                    type="text"
                    value={basicDetails.department || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, department: e.target.value })}
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Shift Timing</label>
                  <input
                    type="text"
                    value={basicDetails.shiftTiming || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, shiftTiming: e.target.value })}
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Prepared Time</label>
                  <input
                    type="text"
                    value={basicDetails.preparedTime || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, preparedTime: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* 2. DAILY TASK SUMMARY */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">2</span>
                  Daily Task Summary
                </h2>
                <button
                  type="button"
                  onClick={addSummaryRow}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[40%]">Activity</th>
                      <th className="px-5 py-4 w-[20%] text-center">Status</th>
                      <th className="px-5 py-4 w-[35%]">Remarks</th>
                      <th className="px-5 py-4 w-[5%] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dailyTaskSummary.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.activity}
                            onChange={(e) => {
                              const updated = [...dailyTaskSummary];
                              updated[index].activity = e.target.value;
                              setDailyTaskSummary(updated);
                            }}
                            placeholder="Website Development, CRM Software, etc."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <select
                            value={item.status}
                            onChange={(e) => {
                              const updated = [...dailyTaskSummary];
                              updated[index].status = e.target.value;
                              setDailyTaskSummary(updated);
                            }}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                          >
                            <option value="Done">Done</option>
                            <option value="ongoing">ongoing</option>
                            <option value="onprogress">onprogress</option>
                            <option value="Pending">Pending</option>
                            <option value="NA">NA</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => {
                              const updated = [...dailyTaskSummary];
                              updated[index].remarks = e.target.value;
                              setDailyTaskSummary(updated);
                            }}
                            placeholder="Add comment..."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeSummaryRow(index)}
                            disabled={dailyTaskSummary.length === 1}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. DEVELOPMENT WORK REPORT */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">3</span>
                  Development Work Report
                </h2>
                <button
                  type="button"
                  onClick={addDevRow}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[25%]">Project</th>
                      <th className="px-5 py-4 w-[45%]">Development Activity</th>
                      <th className="px-5 py-4 w-[12%] text-center">Status</th>
                      <th className="px-5 py-4 w-[13%]">Remark</th>
                      <th className="px-5 py-4 w-[5%] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {developmentWorkReport.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.project}
                            onChange={(e) => {
                              const updated = [...developmentWorkReport];
                              updated[index].project = e.target.value;
                              setDevelopmentWorkReport(updated);
                            }}
                            placeholder="Ayurvedic website, CRM"
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <textarea
                            value={item.activity}
                            onChange={(e) => {
                              const updated = [...developmentWorkReport];
                              updated[index].activity = e.target.value;
                              setDevelopmentWorkReport(updated);
                            }}
                            placeholder="Changes in UI, debugging, etc."
                            rows={1}
                            className="w-full bg-transparent border-none focus:outline-none resize-y text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <select
                            value={item.status}
                            onChange={(e) => {
                              const updated = [...developmentWorkReport];
                              updated[index].status = e.target.value;
                              setDevelopmentWorkReport(updated);
                            }}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                          >
                            <option value="Done">Done</option>
                            <option value="ongoing">ongoing</option>
                            <option value="onprogress">onprogress</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.remark}
                            onChange={(e) => {
                              const updated = [...developmentWorkReport];
                              updated[index].remark = e.target.value;
                              setDevelopmentWorkReport(updated);
                            }}
                            placeholder="e.g. Client verified"
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeDevRow(index)}
                            disabled={developmentWorkReport.length === 1}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. R&D INNOVATION REPORT */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4</span>
                  R&D Innovation Report
                </h2>
                <button
                  type="button"
                  onClick={addInnovRow}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[30%]">Activity</th>
                      <th className="px-5 py-4 w-[50%]">Details</th>
                      <th className="px-5 py-4 w-[15%] text-center">Status</th>
                      <th className="px-5 py-4 w-[5%] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rdInnovationReport.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.activity}
                            onChange={(e) => {
                              const updated = [...rdInnovationReport];
                              updated[index].activity = e.target.value;
                              setRdInnovationReport(updated);
                            }}
                            placeholder="Research activity..."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <textarea
                            value={item.details}
                            onChange={(e) => {
                              const updated = [...rdInnovationReport];
                              updated[index].details = e.target.value;
                              setRdInnovationReport(updated);
                            }}
                            placeholder="Technical findings / documentation..."
                            rows={1}
                            className="w-full bg-transparent border-none focus:outline-none resize-y text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.status}
                            onChange={(e) => {
                              const updated = [...rdInnovationReport];
                              updated[index].status = e.target.value;
                              setRdInnovationReport(updated);
                            }}
                            placeholder="Done / In Progress"
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeInnovRow(index)}
                            disabled={rdInnovationReport.length === 1}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. KPI TRACKING */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">5</span>
                  KPI Tracking
                </h2>
                <button
                  type="button"
                  onClick={addKpiRow}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[20%]">Project</th>
                      <th className="px-5 py-4 w-[40%]">KPI</th>
                      <th className="px-5 py-4 w-[20%]">TARGET</th>
                      <th className="px-5 py-4 w-[15%] text-center">ACHIEVED</th>
                      <th className="px-5 py-4 w-[5%] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {kpiTracking.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.project}
                            onChange={(e) => {
                              const updated = [...kpiTracking];
                              updated[index].project = e.target.value;
                              setKpiTracking(updated);
                            }}
                            placeholder="Ayurvedic website"
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <textarea
                            value={item.kpi}
                            onChange={(e) => {
                              const updated = [...kpiTracking];
                              updated[index].kpi = e.target.value;
                              setKpiTracking(updated);
                            }}
                            placeholder="Changes in UI"
                            rows={1}
                            className="w-full bg-transparent border-none focus:outline-none resize-y text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.target}
                            onChange={(e) => {
                              const updated = [...kpiTracking];
                              updated[index].target = e.target.value;
                              setKpiTracking(updated);
                            }}
                            placeholder="Complete / Excelimport"
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.achieved}
                            onChange={(e) => {
                              const updated = [...kpiTracking];
                              updated[index].achieved = e.target.value;
                              setKpiTracking(updated);
                            }}
                            placeholder="Done"
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeKpiRow(index)}
                            disabled={kpiTracking.length === 1}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. ISSUES / SUPPORT REQUIRED */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">6</span>
                  Issues / Support Required
                </h2>
                <button
                  type="button"
                  onClick={addIssueRow}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[40%]">ISSUE</th>
                      <th className="px-5 py-4 w-[20%] text-center">PRIORITY</th>
                      <th className="px-5 py-4 w-[35%]">ACTION TAKEN</th>
                      <th className="px-5 py-4 w-[5%] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issuesSupportRequired.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.issue}
                            onChange={(e) => {
                              const updated = [...issuesSupportRequired];
                              updated[index].issue = e.target.value;
                              setIssuesSupportRequired(updated);
                            }}
                            placeholder="HR / Admin Manager, COO, etc."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.priority}
                            onChange={(e) => {
                              const updated = [...issuesSupportRequired];
                              updated[index].priority = e.target.value;
                              setIssuesSupportRequired(updated);
                            }}
                            placeholder="High / Medium / Low"
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.actionTaken}
                            onChange={(e) => {
                              const updated = [...issuesSupportRequired];
                              updated[index].actionTaken = e.target.value;
                              setIssuesSupportRequired(updated);
                            }}
                            placeholder="Pending / Discussed"
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeIssueRow(index)}
                            disabled={issuesSupportRequired.length === 1}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. NEXT DAY PLANNING & 8. HOD COMMENTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">7</span>
                  Next Day Planning
                </h2>
                <textarea
                  value={nextDayPlanning}
                  onChange={(e) => setNextDayPlanning(e.target.value)}
                  placeholder="CRM Continues, etc."
                  rows={4}
                  className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 resize-y"
                />
              </div>

              <div className="space-y-3">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">8</span>
                  HOD Comments
                </h2>
                <textarea
                  value={hodComments}
                  onChange={(e) => setHodComments(e.target.value)}
                  placeholder="Manager review notes, specific R&D challenges..."
                  rows={4}
                  className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 resize-y"
                />
              </div>
            </div>

            {/* 9. APPROVALS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">9</span>
                Approval Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3 border-r border-slate-200/50 dark:border-slate-800/50 pr-0 md:pr-6">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">HOD - R&D /Developer</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.hodName || ''}
                      onChange={(e) => setApproval({ ...approval, hodName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Signature (Initials)</label>
                    <input
                      type="text"
                      value={approval.hodSignature || ''}
                      onChange={(e) => setApproval({ ...approval, hodSignature: e.target.value })}
                      placeholder="Type initials..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.hodDate || ''}
                      onChange={(e) => setApproval({ ...approval, hodDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manager - OPS Creative & Marketing</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.managerName || ''}
                      onChange={(e) => setApproval({ ...approval, managerName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Signature (Initials)</label>
                    <input
                      type="text"
                      value={approval.managerSignature || ''}
                      onChange={(e) => setApproval({ ...approval, managerSignature: e.target.value })}
                      placeholder="Type initials..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.managerDate || ''}
                      onChange={(e) => setApproval({ ...approval, managerDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
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

export default HodRdReportPage;
