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

// Default items for Daily Task Summary (matching the mockup)
const DEFAULT_TASK_SUMMARY = [
  { activity: 'Website Development', status: 'Done', remarks: '' },
  { activity: 'CRM Software Planning', status: 'Done', remarks: '' },
  { activity: 'Testing/Bug Fixing', status: 'NA', remarks: '' },
  { activity: 'UI/UX Improvements', status: 'NA', remarks: '' },
  { activity: 'Client Revision Work', status: 'NA', remarks: '' }
];

// Default items for Development Task Report
const DEFAULT_DEV_REPORT = [
  { project: 'CRM', activity: '-Updated Dashboard\n-Debugging\n-Deployed', status: 'ongoing', remark: '' }
];

const DeveloperReportPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isPrivileged, setIsPrivileged] = useState(false);
  
  // Selection state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [developers, setDevelopers] = useState([]);
  const [submittedDates, setSubmittedDates] = useState([]);
  
  // Form State
  const [basicDetails, setBasicDetails] = useState({
    date: '',
    day: '',
    employeeName: '',
    employeeId: '',
    department: '',
    designation: '',
    shiftTiming: '9:00 AM - 5:00 PM',
    reportingTo: 'HOD- R&D Software & Web Developer',
    preparedTime: ''
  });
  
  const [dailyTaskSummary, setDailyTaskSummary] = useState(DEFAULT_TASK_SUMMARY);
  const [developmentTaskReport, setDevelopmentTaskReport] = useState(DEFAULT_DEV_REPORT);
  const [researchLearning, setResearchLearning] = useState([{ activity: '', details: '' }]);
  const [performanceTracker, setPerformanceTracker] = useState({
    taskCompleted: 'Good',
    learningProgress: 'Improving',
    communication: 'Good',
    attendance: 'Present',
    productivity: 'Present'
  });
  const [toolsUsed, setToolsUsed] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [internRemarks, setInternRemarks] = useState('');
  const [approval, setApproval] = useState({
    internName: '',
    internSignature: '',
    internDate: '',
    hodName: 'HOD - R&D / Developer',
    hodSignature: '',
    hodDate: ''
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

  // Fetch developers list (for HR/Admins)
  useEffect(() => {
    if (isPrivileged) {
      const fetchDevs = async () => {
        try {
          const res = await fetch(`${API_BASE}/v1/developer-reports/developers`, {
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setDevelopers(data.data);
            if (data.data.length > 0 && !selectedUserId) {
              setSelectedUserId(data.data[0]._id);
            }
          }
        } catch (e) {
          console.error("Failed to fetch developers list:", e);
        }
      };
      fetchDevs();
    }
  }, [isPrivileged, getAuthHeaders, selectedUserId]);

  // Fetch submitted report dates list for highlighting
  const fetchSubmittedDates = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/developer-reports/submitted-dates?userId=${userId}`, {
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

  // Fetch developer report data for selected date and user
  const fetchReport = useCallback(async (userId, dateStr) => {
    if (!userId || !dateStr) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/developer-reports/by-date?userId=${userId}&dateString=${dateStr}`, {
        headers: getAuthHeaders()
      });
      
      const data = await res.json();
      
      if (data.success && data.data) {
        const report = data.data;
        setBasicDetails(report.basicDetails || {});
        setDailyTaskSummary(report.dailyTaskSummary || []);
        setDevelopmentTaskReport(report.developmentTaskReport || []);
        setResearchLearning(report.researchLearning || []);
        setPerformanceTracker(report.performanceTracker || {
          taskCompleted: 'Good',
          learningProgress: 'Improving',
          communication: 'Good',
          attendance: 'Present',
          productivity: 'Present'
        });
        setToolsUsed(report.toolsUsed || '');
        setChallengesFaced(report.challengesFaced || '');
        setNextDayPlan(report.nextDayPlan || '');
        setInternRemarks(report.internRemarks || '');
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
    // Find selected user info
    let userDetail = currentUser;
    if (isPrivileged && developers.length > 0) {
      userDetail = developers.find(d => d._id === userId) || currentUser;
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
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = hours + ':' + minutes + ' ' + ampm;

    setBasicDetails({
      date: formattedDateString,
      day: dayName,
      employeeName: userDetail.name || '',
      employeeId: userDetail.employeeId || '',
      department: 'R&D/ Development',
      designation: userDetail.designation || 'Developer',
      shiftTiming: '9:00 AM - 5:00 PM',
      reportingTo: userDetail.reportingManager || 'HOD - R&D / Developer',
      preparedTime: timeStr
    });

    setDailyTaskSummary(DEFAULT_TASK_SUMMARY);
    setDevelopmentTaskReport(DEFAULT_DEV_REPORT);
    setResearchLearning([{ activity: '', details: '' }]);
    setPerformanceTracker({
      taskCompleted: 'Good',
      learningProgress: 'Improving',
      communication: 'Good',
      attendance: 'Present',
      productivity: 'Present'
    });
    setToolsUsed('');
    setChallengesFaced('');
    setNextDayPlan('');
    setInternRemarks('');
    setApproval({
      internName: userDetail.name || '',
      internSignature: '',
      internDate: formattedDateString,
      hodName: 'HOD - R&D / Developer',
      hodSignature: '',
      hodDate: ''
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
        developmentTaskReport,
        researchLearning,
        performanceTracker,
        toolsUsed,
        challengesFaced,
        nextDayPlan,
        internRemarks,
        approval
      };

      const res = await fetch(`${API_BASE}/v1/developer-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Daily Shift Report saved successfully!", 'success');
        // Refresh status indicators
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
      doc.text("JUNIOR DEVELOPER / SOFTWARE & WEB DEVELOPER", 112, 22);

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

      // 3. DEVELOPMENT TASK REPORT
      drawSectionHeader("3. DEVELOPMENT TASK REPORT");
      
      const devHeaders = [["Project", "Development Activity", "Status", "Remark"]];
      const devRows = developmentTaskReport.map(t => [
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

      // 4. RESEARCH & LEARNING ACTIVITIES
      drawSectionHeader("4. RESEARCH & LEARNING ACTIVITIES");
      
      const researchHeaders = [["Activity", "Details"]];
      const researchRows = researchLearning.map(t => [
        t.activity || '',
        t.details || ''
      ]);

      autoTable(doc, {
        head: researchHeaders,
        body: researchRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 55 },
          1: { width: 127 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 5. DAILY PERFORMANCE TRACKER
      drawSectionHeader("5. DAILY PERFORMANCE TRACKER");
      
      const perfHeaders = [["KPI", "STATUS"]];
      const perfRows = [
        ["Task Completed", performanceTracker.taskCompleted || ''],
        ["Learning Progress", performanceTracker.learningProgress || ''],
        ["Communication", performanceTracker.communication || ''],
        ["Attendance", performanceTracker.attendance || ''],
        ["Productivity", performanceTracker.productivity || '']
      ];

      autoTable(doc, {
        head: perfHeaders,
        body: perfRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 91, fontStyle: 'bold' },
          1: { width: 91, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      // Page break to start Page 2 fresh
      doc.addPage();
      currentY = 15;

      // 6. TOOLS AND SOFTWARE USED
      drawSectionHeader("6. TOOLS AND SOFTWARE USED");
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const toolsLines = doc.splitTextToSize(toolsUsed || '', 178);
      doc.text(toolsLines, 16, currentY + 5);
      const toolsBoxHeight = Math.max(12, toolsLines.length * 4.2 + 5);
      doc.setDrawColor(180, 180, 180);
      doc.rect(14, currentY, 182, toolsBoxHeight);
      currentY += toolsBoxHeight + 4;

      // 7. CHALLENGES FACED
      drawSectionHeader("7. CHALLENGES FACED");
      const challengesLines = doc.splitTextToSize(challengesFaced || '', 178);
      doc.text(challengesLines, 16, currentY + 5);
      const challengesBoxHeight = Math.max(12, challengesLines.length * 4.2 + 5);
      doc.rect(14, currentY, 182, challengesBoxHeight);
      currentY += challengesBoxHeight + 4;

      // 8. NEXT DAY PLAN
      drawSectionHeader("8. NEXT DAY PLAN");
      const planLines = doc.splitTextToSize(nextDayPlan || '', 178);
      doc.text(planLines, 16, currentY + 5);
      const planBoxHeight = Math.max(12, planLines.length * 4.2 + 5);
      doc.rect(14, currentY, 182, planBoxHeight);
      currentY += planBoxHeight + 4;

      // 8. INTERN / STUDENT REMARKS
      drawSectionHeader("8. INTERN / STUDENT REMARKS");
      const remarksLines = doc.splitTextToSize(internRemarks || '', 178);
      doc.text(remarksLines, 16, currentY + 5);
      const remarksBoxHeight = Math.max(12, remarksLines.length * 4.2 + 5);
      doc.rect(14, currentY, 182, remarksBoxHeight);
      currentY += remarksBoxHeight + 4;

      // 9. APPROVAL
      drawSectionHeader("9. APPROVAL");
      const approvalHeaders = [["Name", "Signature", "Date"]];
      const approvalRows = [
        [
          `Intern / Student: ${approval.internName || ''}`,
          approval.internSignature || '',
          approval.internDate || ''
        ],
        [
          `HOD - R&D / Developer: ${approval.hodName || ''}`,
          approval.hodSignature || '',
          approval.hodDate || ''
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

      doc.save(`Daily_Shift_Report_${basicDetails.employeeName || 'Developer'}_${selectedDate}.pdf`);
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
    setDevelopmentTaskReport([...developmentTaskReport, { project: '', activity: '', status: 'ongoing', remark: '' }]);
  };

  const removeDevRow = (index) => {
    if (developmentTaskReport.length > 1) {
      setDevelopmentTaskReport(developmentTaskReport.filter((_, i) => i !== index));
    }
  };

  const addResearchRow = () => {
    setResearchLearning([...researchLearning, { activity: '', details: '' }]);
  };

  const removeResearchRow = (index) => {
    if (researchLearning.length > 1) {
      setResearchLearning(researchLearning.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* LEFT PANEL: Date Select Sidebar */}
      <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-5 shadow-sm">
        
        {isPrivileged && (
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Developer
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {developers.map(dev => (
                  <option key={dev._id} value={dev._id}>
                    {dev.name} ({dev.employeeId || 'No ID'})
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
                  Daily Shift Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill, review, and export shift report details.
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee Name</label>
                  <input
                    type="text"
                    value={basicDetails.employeeName || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, employeeName: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee ID</label>
                  <input
                    type="text"
                    value={basicDetails.employeeId || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, employeeId: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                  <input
                    type="text"
                    value={basicDetails.department || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, department: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={basicDetails.designation || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, designation: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Shift Timing</label>
                  <input
                    type="text"
                    value={basicDetails.shiftTiming || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, shiftTiming: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Reporting Manager</label>
                  <input
                    type="text"
                    value={basicDetails.reportingTo || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, reportingTo: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Prepared Time</label>
                  <input
                    type="text"
                    value={basicDetails.preparedTime || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, preparedTime: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. DAILY TASK SUMMARY */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">2</span>
                  Daily Task Summary
                </h2>
                <button
                  type="button"
                  onClick={addSummaryRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-lime-400 hover:opacity-80"
                >
                  <Plus size={14} />
                  Add Activity
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3 w-40">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {dailyTaskSummary.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/10">
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.activity}
                            onChange={(e) => {
                              const newArr = [...dailyTaskSummary];
                              newArr[i].activity = e.target.value;
                              setDailyTaskSummary(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none focus:ring-0 focus:border-none p-0 text-sm"
                            placeholder="Enter activity name"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...dailyTaskSummary];
                              newArr[i].status = e.target.value;
                              setDailyTaskSummary(newArr);
                            }}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none"
                          >
                            <option value="Done">Done</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Pending">Pending</option>
                            <option value="NA">NA</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => {
                              const newArr = [...dailyTaskSummary];
                              newArr[i].remarks = e.target.value;
                              setDailyTaskSummary(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                            placeholder="Add remarks"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeSummaryRow(i)}
                            className="text-rose-500 hover:text-rose-600 transition-colors"
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

            {/* 3. DEVELOPMENT TASK REPORT */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">3</span>
                  Development Task Report
                </h2>
                <button
                  type="button"
                  onClick={addDevRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-lime-400 hover:opacity-80"
                >
                  <Plus size={14} />
                  Add Project
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3 w-48">Project</th>
                      <th className="px-4 py-3">Development Activity</th>
                      <th className="px-4 py-3 w-40">Status</th>
                      <th className="px-4 py-3 w-48">Remark</th>
                      <th className="px-4 py-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {developmentTaskReport.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/10">
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.project}
                            onChange={(e) => {
                              const newArr = [...developmentTaskReport];
                              newArr[i].project = e.target.value;
                              setDevelopmentTaskReport(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm font-semibold"
                            placeholder="e.g. CRM"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <textarea
                            value={row.activity}
                            onChange={(e) => {
                              const newArr = [...developmentTaskReport];
                              newArr[i].activity = e.target.value;
                              setDevelopmentTaskReport(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm resize-y min-h-[36px]"
                            placeholder="-Description of work done"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...developmentTaskReport];
                              newArr[i].status = e.target.value;
                              setDevelopmentTaskReport(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                            placeholder="e.g. ongoing / done"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.remark}
                            onChange={(e) => {
                              const newArr = [...developmentTaskReport];
                              newArr[i].remark = e.target.value;
                              setDevelopmentTaskReport(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                            placeholder="Add remark"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeDevRow(i)}
                            className="text-rose-500 hover:text-rose-600 transition-colors"
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

            {/* 4. RESEARCH & LEARNING ACTIVITIES */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4</span>
                  Research & Learning Activities
                </h2>
                <button
                  type="button"
                  onClick={addResearchRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-lime-400 hover:opacity-80"
                >
                  <Plus size={14} />
                  Add Activity
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3 w-72">Activity</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {researchLearning.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/10">
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.activity}
                            onChange={(e) => {
                              const newArr = [...researchLearning];
                              newArr[i].activity = e.target.value;
                              setResearchLearning(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm font-semibold"
                            placeholder="Activity name"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.details}
                            onChange={(e) => {
                              const newArr = [...researchLearning];
                              newArr[i].details = e.target.value;
                              setResearchLearning(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                            placeholder="Enter details"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeResearchRow(i)}
                            className="text-rose-500 hover:text-rose-600 transition-colors"
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

            {/* 5. DAILY PERFORMANCE TRACKER */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">5</span>
                Daily Performance Tracker
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Task Completed</label>
                  <select
                    value={performanceTracker.taskCompleted || 'Good'}
                    onChange={(e) => setPerformanceTracker({ ...performanceTracker, taskCompleted: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Good">Good</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Learning Progress</label>
                  <select
                    value={performanceTracker.learningProgress || 'Improving'}
                    onChange={(e) => setPerformanceTracker({ ...performanceTracker, learningProgress: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Improving">Improving</option>
                    <option value="Good">Good</option>
                    <option value="Slow">Slow</option>
                    <option value="NA">NA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Communication</label>
                  <select
                    value={performanceTracker.communication || 'Good'}
                    onChange={(e) => setPerformanceTracker({ ...performanceTracker, communication: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Good">Good</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Average">Average</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Attendance</label>
                  <select
                    value={performanceTracker.attendance || 'Present'}
                    onChange={(e) => setPerformanceTracker({ ...performanceTracker, attendance: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Productivity</label>
                  <select
                    value={performanceTracker.productivity || 'Present'}
                    onChange={(e) => setPerformanceTracker({ ...performanceTracker, productivity: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Present">Present</option>
                    <option value="Highly Productive">Highly Productive</option>
                    <option value="Average">Average</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 6. TOOLS AND SOFTWARE USED */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">6</span>
                Tools and Software Used
              </h2>
              <textarea
                value={toolsUsed}
                onChange={(e) => setToolsUsed(e.target.value)}
                placeholder="e.g. VS Code, Git, Chrome DevTools, Postman"
                className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>

            {/* 7. CHALLENGES FACED */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">7</span>
                Challenges Faced
              </h2>
              <textarea
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
                placeholder="Describe any blockers or challenges faced today"
                className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>

            {/* 8. NEXT DAY PLAN */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">8</span>
                Next Day Plan
              </h2>
              <textarea
                value={nextDayPlan}
                onChange={(e) => setNextDayPlan(e.target.value)}
                placeholder="List tasks planned for tomorrow"
                className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>

            {/* 9. INTERN / STUDENT REMARKS */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">8</span>
                Intern / Student Remarks
              </h2>
              <textarea
                value={internRemarks}
                onChange={(e) => setInternRemarks(e.target.value)}
                placeholder="Any special remarks or suggestions"
                className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>

            {/* 10. APPROVAL */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">9</span>
                Approval Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Intern / Student</h4>
                  <div>
                    <label className="block text-xs mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.internName || ''}
                      onChange={(e) => setApproval({ ...approval, internName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Signature</label>
                    <input
                      type="text"
                      value={approval.internSignature || ''}
                      onChange={(e) => setApproval({ ...approval, internSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Type signature"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.internDate || ''}
                      onChange={(e) => setApproval({ ...approval, internDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">HOD - R&D / Developer</h4>
                  <div>
                    <label className="block text-xs mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.hodName || ''}
                      onChange={(e) => setApproval({ ...approval, hodName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Signature</label>
                    <input
                      type="text"
                      value={approval.hodSignature || ''}
                      onChange={(e) => setApproval({ ...approval, hodSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="HOD signature"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.hodDate || ''}
                      onChange={(e) => setApproval({ ...approval, hodDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Form Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
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

          </motion.div>
        )}
      </div>

    </div>
  );
};

export default DeveloperReportPage;
