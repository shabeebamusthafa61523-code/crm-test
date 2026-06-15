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

// Default data for Operations Manager Shift Report
const DEFAULT_DAILY_OPERATIONS = [
  { activity: 'Team Attendance Verified', status: 'Done', remarks: '' },
  { activity: 'Daily Sales Targets Assigned', status: 'Done', remarks: '' },
  { activity: 'Lead Follow-up Reviewed', status: 'Done', remarks: '' },
  { activity: 'Client Meetings Conducted', status: 'NO', remarks: '' },
  { activity: 'Academy Coordination Completed', status: 'NA', remarks: '' },
  { activity: 'Reports Collected from Team', status: 'Done', remarks: '' }
];

const DEFAULT_SALES_ACTIVITY = [
  { activity: 'New Leads Generated from marketing team', count: '1 (Inbound)', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Qualified Lead', count: '0', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Total Calls Made', count: '41', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Total Follow up', count: '40', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Hot Leads', count: '1', digitalMktg: '', web: '1', remarks: '' },
  { activity: 'Warm Leads', count: '0', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Cold Leads', count: '0', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Call back Leads', count: '2', digitalMktg: '', web: '', remarks: '' },
  { activity: 'RNT Leads (Ring Next Time)', count: '23', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Switch Off Leads', count: '1', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Wrong leads', count: '14', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Total Pending Follow-ups', count: '0', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Total Pending Leads', count: '0', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Client/Student Meetings Fixed', count: '0', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Admissions/Closings Done', count: '0', digitalMktg: '', web: '', remarks: '' }
];

const DEFAULT_SALES_PERFORMANCE = [
  { staffName: 'Sales Executive', taskAssigned: 'Ms. Rajalakshmi KM', leads: '41', closings: '41', status: 'DONE' },
  { staffName: 'Tele Caller', taskAssigned: 'NIL', leads: '', closings: '', status: '' },
  { staffName: 'Freelance Exec.', taskAssigned: 'NIL', leads: '', closings: '', status: '' },
  { staffName: 'Intern/Trainee', taskAssigned: 'NIL', leads: '', closings: '', status: '' }
];

const DEFAULT_REVENUE_TRACKING = [
  { category: 'Sales Revenue', amount: '₹00' },
  { category: 'Academy Revenue', amount: '₹00' },
  { category: 'Pending Payments', amount: '₹00' },
  { category: 'Total Revenue', amount: '₹00' }
];

const DEFAULT_ACADEMY_STATUS = [
  { activity: 'Classes Conducted', status: 'No', remarks: '' },
  { activity: 'Mentor Coordination', status: 'No', remarks: '' },
  { activity: 'Student Follow-up', status: 'No', remarks: '' },
  { activity: 'Admissions Follow-up', status: 'No', remarks: '' }
];

const OpsReportPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isPrivileged, setIsPrivileged] = useState(false);

  // Selection states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [opsStaff, setOpsStaff] = useState([]);
  const [submittedDates, setSubmittedDates] = useState([]);

  // Form States
  const [basicDetails, setBasicDetails] = useState({
    date: '',
    day: '',
    employeeName: '',
    employeeId: '',
    department: 'Sales & Growth',
    designation: 'Manager - OPS',
    shiftTiming: '9:30 AM - 5:30 PM',
    reportingTo: 'Executive Director',
    preparedTime: ''
  });

  const [dailyOperations, setDailyOperations] = useState(DEFAULT_DAILY_OPERATIONS);
  const [salesActivity, setSalesActivity] = useState(DEFAULT_SALES_ACTIVITY);
  const [salesPerformance, setSalesPerformance] = useState(DEFAULT_SALES_PERFORMANCE);
  const [revenueTracking, setRevenueTracking] = useState(DEFAULT_REVENUE_TRACKING);
  const [academyStatus, setAcademyStatus] = useState(DEFAULT_ACADEMY_STATUS);
  
  const [issuesEscalations, setIssuesEscalations] = useState({
    issue: '',
    priority: '',
    actionTaken: ''
  });

  const [handover, setHandover] = useState({
    pendingLeadsShared: 'Yes',
    crmUpdated: 'Yes / No- NA',
    reportsSubmitted: 'Yes',
    teamUpdated: 'Yes'
  });

  const [approval, setApproval] = useState({
    opsName: '',
    opsSignature: '',
    opsDate: '',
    directorName: 'Executive Director Approval',
    directorSignature: '',
    directorDate: ''
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

  // Fetch Ops Staff List (For Admins)
  useEffect(() => {
    if (isPrivileged) {
      const fetchOpsStaff = async () => {
        try {
          const res = await fetch(`${API_BASE}/v1/ops-reports/ops-staff`, {
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setOpsStaff(data.data);
            if (data.data.length > 0 && !selectedUserId) {
              setSelectedUserId(data.data[0]._id);
            }
          }
        } catch (e) {
          console.error("Failed to fetch Ops Staff list:", e);
        }
      };
      fetchOpsStaff();
    }
  }, [isPrivileged, getAuthHeaders, selectedUserId]);

  // Fetch submitted dates
  const fetchSubmittedDates = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/ops-reports/submitted-dates?userId=${userId}`, {
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

  // Fetch Ops report data
  const fetchReport = useCallback(async (userId, dateStr) => {
    if (!userId || !dateStr) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/ops-reports/by-date?userId=${userId}&dateString=${dateStr}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && data.data) {
        const report = data.data;
        setBasicDetails(report.basicDetails || {});
        setDailyOperations(report.dailyOperations || []);
        setSalesActivity(report.salesActivity || []);
        setSalesPerformance(report.salesPerformance || []);
        setRevenueTracking(report.revenueTracking || []);
        setAcademyStatus(report.academyStatus || []);
        setIssuesEscalations(report.issuesEscalations || { issue: '', priority: '', actionTaken: '' });
        setHandover(report.handover || { pendingLeadsShared: 'Yes', crmUpdated: 'Yes / No- NA', reportsSubmitted: 'Yes', teamUpdated: 'Yes' });
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
    if (isPrivileged && opsStaff.length > 0) {
      userDetail = opsStaff.find(u => u._id === userId) || currentUser;
    }

    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDateString = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY

    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    setBasicDetails({
      date: formattedDateString,
      day: dayName,
      employeeName: userDetail.name || '',
      employeeId: userDetail.employeeId || '',
      department: 'Sales & Growth',
      designation: userDetail.designation || 'Manager - OPS',
      shiftTiming: '9:30 AM - 5:30 PM',
      reportingTo: userDetail.reportingManager || 'Executive Director',
      preparedTime: timeStr
    });

    setDailyOperations(DEFAULT_DAILY_OPERATIONS);
    setSalesActivity(DEFAULT_SALES_ACTIVITY);
    setSalesPerformance(DEFAULT_SALES_PERFORMANCE);
    setRevenueTracking(DEFAULT_REVENUE_TRACKING);
    setAcademyStatus(DEFAULT_ACADEMY_STATUS);
    setIssuesEscalations({
      issue: '',
      priority: '',
      actionTaken: ''
    });
    setHandover({
      pendingLeadsShared: 'Yes',
      crmUpdated: 'Yes / No- NA',
      reportsSubmitted: 'Yes',
      teamUpdated: 'Yes'
    });
    setApproval({
      opsName: userDetail.name || '',
      opsSignature: '',
      opsDate: formattedDateString,
      directorName: 'Executive Director Approval',
      directorSignature: '',
      directorDate: ''
    });
  };

  const handleSaveReport = async () => {
    try {
      setSaving(true);
      const payload = {
        userId: selectedUserId,
        dateString: selectedDate,
        basicDetails,
        dailyOperations,
        salesActivity,
        salesPerformance,
        revenueTracking,
        academyStatus,
        issuesEscalations,
        handover,
        approval
      };

      const res = await fetch(`${API_BASE}/v1/ops-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Operations Daily Shift Report saved successfully!", 'success');
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
      const purpleColor = [60, 35, 117];

      const drawSectionHeader = (title) => {
        doc.setFillColor(60, 35, 117);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), 17, currentY + 5);
        currentY += 7;
      };

      const drawHeader = () => {
        // Logo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(132, 204, 22); // Lime Green
        doc.text("KOD.", 14, 21);
        
        doc.setTextColor(60, 35, 117);
        doc.text("brand", 34, 21);

        // Title
        doc.setFontSize(15);
        doc.setTextColor(60, 35, 117);
        doc.text("DAILY SHIFT REPORT", 132, 16);
        
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text("MANAGER - OPS SALES & GROWTH", 139, 22);
      };

      // ================= PAGE 1 =================
      drawHeader();
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

      // 2. DAILY OPERATIONS SUMMARY
      drawSectionHeader("2. DAILY OPERATIONS SUMMARY");
      const opsHeaders = [["Activity", "Status", "Remarks"]];
      const opsRows = dailyOperations.map(o => [o.activity || '', o.status || '', o.remarks || '']);

      autoTable(doc, {
        head: opsHeaders,
        body: opsRows,
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

      // 3. DAILY COURSE COUNSELING & SALES ACTIVITY
      drawSectionHeader("3. DAILY COURSE COUNSELING & SALES ACTIVITY");
      const counselingHeaders = [["Activity", "Count", "Digital Mktg", "Web", "Remarks"]];
      const counselingRows = salesActivity.map(s => [s.activity || '', s.count || '', s.digitalMktg || '', s.web || '', s.remarks || '']);

      autoTable(doc, {
        head: counselingHeaders,
        body: counselingRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 68 },
          1: { width: 28, halign: 'center' },
          2: { width: 24, halign: 'center' },
          3: { width: 24, halign: 'center' },
          4: { width: 38 }
        },
        margin: { left: 14, right: 14 }
      });

      // ================= PAGE 2 =================
      doc.addPage();
      currentY = 15;
      drawHeader();
      currentY = 27;

      // 4. SALES TEAM PERFORMANCE
      drawSectionHeader("4. SALES TEAM PERFORMANCE");
      const perfHeaders = [["Staff Name", "Task Assigned", "Leads", "Closings", "Status"]];
      const perfRows = salesPerformance.map(p => [p.staffName || '', p.taskAssigned || '', p.leads || '', p.closings || '', p.status || '']);

      autoTable(doc, {
        head: perfHeaders,
        body: perfRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 45 },
          1: { width: 45 },
          2: { width: 30, halign: 'center' },
          3: { width: 30, halign: 'center' },
          4: { width: 32, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 5. REVENUE TRACKING
      drawSectionHeader("5. REVENUE TRACKING");
      const revHeaders = [["Revenue Category", "Amount"]];
      const revRows = revenueTracking.map(r => [r.category || '', r.amount || '']);

      autoTable(doc, {
        head: revHeaders,
        body: revRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 110 },
          1: { width: 72, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 6. ACADEMY STATUS
      drawSectionHeader("6. ACADEMY STATUS");
      const academyHeaders = [["Activity", "Status", "Remarks"]];
      const academyRows = academyStatus.map(a => [a.activity || '', a.status || '', a.remarks || '']);

      autoTable(doc, {
        head: academyHeaders,
        body: academyRows,
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

      // 7. ISSUES / Escalations
      drawSectionHeader("7. ISSUES / ESCALATIONS");
      const issuesRows = [
        ["Issues / Escalations:", issuesEscalations.issue || ''],
        ["Priority:", issuesEscalations.priority || ''],
        ["Action Taken:", issuesEscalations.actionTaken || '']
      ];
      autoTable(doc, {
        body: issuesRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 45 },
          1: { width: 137 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 8. HANDOVER
      drawSectionHeader("8. HANDOVER");
      const handoverRows = [
        ["Pending Leads Shared:", handover.pendingLeadsShared || ''],
        ["CRM Updated: Yes / No - NA", handover.crmUpdated || ''],
        ["Reports Submitted: Yes", handover.reportsSubmitted || ''],
        ["Team Updated: Yes", handover.teamUpdated || '']
      ];
      autoTable(doc, {
        body: handoverRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 65 },
          1: { width: 117 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;

      // Signatures approval
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 35, 117);
      doc.text(approval.opsName || '', 30, currentY);
      doc.text(approval.directorName || '', 130, currentY);

      doc.setDrawColor(60, 35, 117);
      doc.line(20, currentY + 1.5, 75, currentY + 1.5);
      doc.line(120, currentY + 1.5, 175, currentY + 1.5);

      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text("Manager - OPS Sales & Growth", 25, currentY + 5.5);
      doc.text("Executive Director Approval", 127, currentY + 5.5);

      doc.save(`Operations_Daily_Shift_Report_${basicDetails.employeeName || 'Ops'}_${selectedDate}.pdf`);
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT PANEL: Date Select Sidebar */}
      <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-5 shadow-sm">
        {isPrivileged && (
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Operations Staff
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {opsStaff.map(ops => (
                  <option key={ops._id} value={ops._id}>
                    {ops.name} ({ops.employeeId || 'No ID'})
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
                  Operations Daily Shift Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill, review, and download operations daily reports.
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                  <input
                    type="text"
                    value={basicDetails.department || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, department: e.target.value })}
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Shift Timing</label>
                  <input
                    type="text"
                    value={basicDetails.shiftTiming || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, shiftTiming: e.target.value })}
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Prepared Time</label>
                  <input
                    type="text"
                    value={basicDetails.preparedTime || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, preparedTime: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. DAILY OPERATIONS SUMMARY */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">2</span>
                Daily Operations Summary
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3 w-40">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {dailyOperations.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.activity}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...dailyOperations];
                              newArr[i].status = e.target.value;
                              setDailyOperations(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => {
                              const newArr = [...dailyOperations];
                              newArr[i].remarks = e.target.value;
                              setDailyOperations(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                            placeholder="Add remarks"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. DAILY COURSE COUNSELING & SALES ACTIVITY */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">3</span>
                Daily Course Counseling & Sales Activity
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3 w-32 text-center">Count</th>
                      <th className="px-4 py-3 w-32 text-center">Digital Mktg</th>
                      <th className="px-4 py-3 w-32 text-center">Web</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {salesActivity.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.activity}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.count}
                            onChange={(e) => {
                              const newArr = [...salesActivity];
                              newArr[i].count = e.target.value;
                              setSalesActivity(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-center"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.digitalMktg}
                            onChange={(e) => {
                              const newArr = [...salesActivity];
                              newArr[i].digitalMktg = e.target.value;
                              setSalesActivity(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-center"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.web}
                            onChange={(e) => {
                              const newArr = [...salesActivity];
                              newArr[i].web = e.target.value;
                              setSalesActivity(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-center"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => {
                              const newArr = [...salesActivity];
                              newArr[i].remarks = e.target.value;
                              setSalesActivity(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. SALES TEAM PERFORMANCE */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4</span>
                Sales Team Performance
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Staff Name</th>
                      <th className="px-4 py-3">Task Assigned</th>
                      <th className="px-4 py-3 w-32 text-center">Leads</th>
                      <th className="px-4 py-3 w-32 text-center">Closings</th>
                      <th className="px-4 py-3 w-32 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {salesPerformance.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.staffName}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.taskAssigned}
                            onChange={(e) => {
                              const newArr = [...salesPerformance];
                              newArr[i].taskAssigned = e.target.value;
                              setSalesPerformance(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.leads}
                            onChange={(e) => {
                              const newArr = [...salesPerformance];
                              newArr[i].leads = e.target.value;
                              setSalesPerformance(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-center"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.closings}
                            onChange={(e) => {
                              const newArr = [...salesPerformance];
                              newArr[i].closings = e.target.value;
                              setSalesPerformance(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-center"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...salesPerformance];
                              newArr[i].status = e.target.value;
                              setSalesPerformance(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. REVENUE TRACKING */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">5</span>
                Revenue Tracking
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Revenue Category</th>
                      <th className="px-4 py-3 w-48 text-center">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {revenueTracking.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.category}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.amount}
                            onChange={(e) => {
                              const newArr = [...revenueTracking];
                              newArr[i].amount = e.target.value;
                              setRevenueTracking(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. ACADEMY STATUS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">6</span>
                Academy Status
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3 w-40">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {academyStatus.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.activity}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...academyStatus];
                              newArr[i].status = e.target.value;
                              setAcademyStatus(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => {
                              const newArr = [...academyStatus];
                              newArr[i].remarks = e.target.value;
                              setAcademyStatus(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. ISSUES / Escalations */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">7</span>
                Issues / Escalations
              </h2>
              <div className="grid grid-cols-1 gap-5 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Issues/Escalations</label>
                  <textarea
                    value={issuesEscalations.issue || ''}
                    onChange={(e) => setIssuesEscalations({ ...issuesEscalations, issue: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <input
                    type="text"
                    value={issuesEscalations.priority || ''}
                    onChange={(e) => setIssuesEscalations({ ...issuesEscalations, priority: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. High / Medium / Low"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Action Taken</label>
                  <textarea
                    value={issuesEscalations.actionTaken || ''}
                    onChange={(e) => setIssuesEscalations({ ...issuesEscalations, actionTaken: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                  />
                </div>
              </div>
            </div>

            {/* 8. HANDOVER */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">8</span>
                Handover Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Pending Leads Shared</label>
                  <input
                    type="text"
                    value={handover.pendingLeadsShared || ''}
                    onChange={(e) => setHandover({ ...handover, pendingLeadsShared: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">CRM Updated: Yes / No - NA</label>
                  <input
                    type="text"
                    value={handover.crmUpdated || ''}
                    onChange={(e) => setHandover({ ...handover, crmUpdated: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Reports Submitted: Yes</label>
                  <input
                    type="text"
                    value={handover.reportsSubmitted || ''}
                    onChange={(e) => setHandover({ ...handover, reportsSubmitted: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Team Updated: Yes</label>
                  <input
                    type="text"
                    value={handover.teamUpdated || ''}
                    onChange={(e) => setHandover({ ...handover, teamUpdated: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 9. APPROVAL */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">9</span>
                Approval Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Manager - OPS</h4>
                  <div>
                    <label className="block text-xs mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.opsName || ''}
                      onChange={(e) => setApproval({ ...approval, opsName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Signature</label>
                    <input
                      type="text"
                      value={approval.opsSignature || ''}
                      onChange={(e) => setApproval({ ...approval, opsSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                      placeholder="Type signature"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.opsDate || ''}
                      onChange={(e) => setApproval({ ...approval, opsDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Executive Director</h4>
                  <div>
                    <label className="block text-xs mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.directorName || ''}
                      onChange={(e) => setApproval({ ...approval, directorName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Signature</label>
                    <input
                      type="text"
                      value={approval.directorSignature || ''}
                      onChange={(e) => setApproval({ ...approval, directorSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                      placeholder="Director signature"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.directorDate || ''}
                      onChange={(e) => setApproval({ ...approval, directorDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
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

export default OpsReportPage;
