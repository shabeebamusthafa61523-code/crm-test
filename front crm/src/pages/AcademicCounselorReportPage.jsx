import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Calendar, Plus, Trash2, Save, Download, 
  CheckCircle, HelpCircle, Loader2, User, ChevronRight, Pencil
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_URL;

// Default items for Daily Course Counseling & Sales Activity
const DEFAULT_SALES_ACTIVITY = [
  { activity: 'New Leads Generated', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Total Calls Made', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Hot Leads', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Warm Leads', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Cold Leads', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Call back Leads', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'RNT Leads (Ring Next Time)', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Switch Off Leads', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Wrong lead', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Follow-ups Completed', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Client/Student Meetings Fixed', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Admissions/Closings Done', count: '', digitalMktg: '', web: '', remarks: '' },
  { activity: 'Pending Follow-ups', count: '', digitalMktg: '', web: '', remarks: '' }
];

// Default items for Daily Operations Summary
const DEFAULT_DAILY_OPERATIONS = [
  { activity: 'Team Attendance Verified', status: 'Done', remarks: '' },
  { activity: 'Daily Sales Targets Assigned', status: 'Pending', remarks: '' },
  { activity: 'Lead Follow-up Reviewed', status: 'Done', remarks: '' },
  { activity: 'Client Meetings Conducted', status: 'Done', remarks: '' }
];

// Default items for Performance KPI
const DEFAULT_PERFORMANCE_KPIS = [
  { kpi: 'Calls Target', target: '', achieved: '' },
  { kpi: 'Counseling Target', target: '', achieved: '' },
  { kpi: 'Follow-up Target', target: '', achieved: '' },
  { kpi: 'Admissions/Closings', target: '', achieved: '' }
];

const AcademicCounselorReportPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isPrivileged, setIsPrivileged] = useState(false);
  
  // Selection state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const queryUserId = queryParams.get('userId');
    if (queryUserId) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          const role = String(userObj.role_id || userObj.role || '').toLowerCase().trim();
          const privileged = ['1', '2', 'hr', 'admin'].includes(role);
          if (privileged) return queryUserId;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return '';
  });
  const [counselors, setCounselors] = useState([]);
  const [submittedDates, setSubmittedDates] = useState([]);
  
  // Form State
  const [basicDetails, setBasicDetails] = useState({
    date: '',
    day: '',
    employeeName: '',
    designation: 'Sales Executive / Tele Caller & Academic Counselor',
    department: 'Sales & Growth / Academy',
    shiftTiming: '9:00 AM - 5.00 PM',
    reportingTo: 'Manager - OPS Sales & Growth'
  });
  
  const [salesActivity, setSalesActivity] = useState(DEFAULT_SALES_ACTIVITY);
  const [dailyOperations, setDailyOperations] = useState(DEFAULT_DAILY_OPERATIONS);
  const [reportsCollectedDone, setReportsCollectedDone] = useState(false);
  const [performanceKpis, setPerformanceKpis] = useState(DEFAULT_PERFORMANCE_KPIS);
  const [issuesFeedback, setIssuesFeedback] = useState([{ issue: '', priority: 'Medium', supportNeeded: '' }]);
  const [finalHandover, setFinalHandover] = useState({ crmUpdated: 'No', reportsSubmitted: 'No' });
  const [approval, setApproval] = useState({
    counselorName: '',
    counselorSignature: '',
    counselorDate: '',
    managerName: 'Manager Approval',
    managerSignature: '',
    managerDate: ''
  });

  // Monthly Report States
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [monthlyStartDate, setMonthlyStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [monthlyEndDate, setMonthlyEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [monthlyActiveTab, setMonthlyActiveTab] = useState('range');
  const [monthlyBasicDetails, setMonthlyBasicDetails] = useState({
    employeeName: '',
    designation: '',
    department: '',
    shiftTiming: '',
    reportingTo: '',
    dateRange: ''
  });
  const [monthlySalesActivity, setMonthlySalesActivity] = useState([]);
  const [monthlyPerformanceKpis, setMonthlyPerformanceKpis] = useState([]);
  const [monthlyDailyOperations, setMonthlyDailyOperations] = useState([]);
  const [monthlyReportsCollectedDone, setMonthlyReportsCollectedDone] = useState(false);
  const [monthlyIssuesFeedback, setMonthlyIssuesFeedback] = useState([]);
  const [isMonthlyConsolidated, setIsMonthlyConsolidated] = useState(false);

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

  // Fetch counselors list (for selection dropdown)
  useEffect(() => {
    const fetchCounselors = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/academic-counselor-reports/counselors`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCounselors(data.data);
          
          const savedUser = localStorage.getItem('user');
          let myId = '';
          if (savedUser) {
            const userObj = JSON.parse(savedUser);
            myId = userObj.id || userObj._id;
          }
          
          if (myId && data.data.some(d => d._id === myId) && !new URLSearchParams(window.location.search).get('userId')) {
            setSelectedUserId(myId);
          } else if (data.data.length > 0 && !selectedUserId) {
            setSelectedUserId(data.data[0]._id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch counselors list:", e);
      }
    };
    fetchCounselors();
  }, [getAuthHeaders, selectedUserId]);

  // Auto-open weekly/monthly modals from URL parameters
  useEffect(() => {
    if (selectedUserId) {
      const queryParams = new URLSearchParams(window.location.search);
      const savedUser = localStorage.getItem('user');
      let isUserPrivileged = false;
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          const role = String(userObj.role_id || userObj.role || '').toLowerCase().trim();
          isUserPrivileged = ['1', '2', 'hr', 'admin'].includes(role);
        } catch (e) {
          console.error(e);
        }
      }

      if (isUserPrivileged) {
        if (queryParams.get('generateMonthly') === 'true') {
          setIsMonthlyModalOpen(true);
        }
        if (queryParams.get('generateWeekly') === 'true' && typeof setIsWeeklyModalOpen === 'function') {
          setIsWeeklyModalOpen(true);
        }
      }
    }
  }, [selectedUserId]);

  // Fetch submitted report dates list for highlighting
  const fetchSubmittedDates = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/academic-counselor-reports/submitted-dates?userId=${userId}`, {
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
      const res = await fetch(`${API_BASE}/v1/academic-counselor-reports/by-date?userId=${userId}&dateString=${dateStr}`, {
        headers: getAuthHeaders()
      });
      
      const data = await res.json();
      
      if (data.success && data.data) {
        const report = data.data;
        setBasicDetails(report.basicDetails || {});
        setSalesActivity(report.salesActivity || []);
        setDailyOperations(report.dailyOperations || []);
        setReportsCollectedDone(report.reportsCollectedDone || false);
        setPerformanceKpis(report.performanceKpis || []);
        setIssuesFeedback(report.issuesFeedback || []);
        setFinalHandover(report.finalHandover || { crmUpdated: 'No', reportsSubmitted: 'No' });
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

  // Cache basicDetails in localStorage when they change
  useEffect(() => {
    if (selectedUserId && basicDetails && (basicDetails.employeeName || basicDetails.employeeId)) {
      const { date, day, ...persistent } = basicDetails;
      if (Object.keys(persistent).length > 0) {
        localStorage.setItem(`cachedBasicDetails_AcademicCounselor_${selectedUserId}`, JSON.stringify(persistent));
      }
    }
  }, [basicDetails, selectedUserId]);

  const initializeBlankReport = (userId, dateStr) => {
    let userDetail = currentUser;
    if (counselors.length > 0) {
      userDetail = counselors.find(d => d._id === userId) || currentUser;
    }

    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDateString = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY

    // Load from cache if exists
    const cached = localStorage.getItem(`cachedBasicDetails_AcademicCounselor_${userId}`);
    const parsedCached = cached ? JSON.parse(cached) : null;

    setBasicDetails({
      date: formattedDateString,
      day: dayName,
      employeeName: parsedCached?.employeeName || userDetail.name || '',
      designation: parsedCached?.designation || userDetail.designation || 'Sales Executive / Tele Caller & Academic Counselor',
      department: parsedCached?.department || 'Sales & Growth / Academy',
      shiftTiming: parsedCached?.shiftTiming || '9:00 AM - 5.00 PM',
      reportingTo: parsedCached?.reportingTo || userDetail.reportingManager || 'Manager - OPS Sales & Growth'
    });

    setSalesActivity(DEFAULT_SALES_ACTIVITY);
    setDailyOperations(DEFAULT_DAILY_OPERATIONS);
    setReportsCollectedDone(false);
    setPerformanceKpis(DEFAULT_PERFORMANCE_KPIS);
    setIssuesFeedback([{ issue: '', priority: 'Medium', supportNeeded: '' }]);
    setFinalHandover({ crmUpdated: 'No', reportsSubmitted: 'No' });
    setApproval({
      counselorName: userDetail.name || '',
      counselorSignature: '',
      counselorDate: formattedDateString,
      managerName: 'Manager Approval',
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
        salesActivity,
        dailyOperations,
        reportsCollectedDone,
        performanceKpis,
        issuesFeedback,
        finalHandover,
        approval
      };

      const res = await fetch(`${API_BASE}/v1/academic-counselor-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Academic Counselor shift report saved successfully!", 'success');
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
    // Automatically save report as well
    handleSaveReport();

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
      
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text("SALES EXECUTIVE / TELE CALLER & ACADEMIC COUNSELOR", 100, 22);

      currentY = 27;

      // 1. BASIC DETAILS
      drawSectionHeader("1. BASIC DETAILS");
      
      const basicDetailsRows = [
        ["Date", basicDetails.date || '', "Day", basicDetails.day || ''],
        ["Employee Name", basicDetails.employeeName || '', "Designation", basicDetails.designation || ''],
        ["Department", basicDetails.department || '', "Shift Timing", basicDetails.shiftTiming || ''],
        ["Reporting To", basicDetails.reportingTo || '', "", ""]
      ];

      autoTable(doc, {
        body: basicDetailsRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 30 },
          1: { width: 61 },
          2: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 30 },
          3: { width: 61 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 2. DAILY COURSE COUNSELING & SALES ACTIVITY
      drawSectionHeader("2. DAILY COURSE COUNSELING & SALES ACTIVITY");
      
      const salesHeaders = [["Activity", "Count", "Digital Mktg", "Web", "Remarks"]];
      const salesRows = salesActivity.map(t => [
        t.activity || '',
        t.count || '',
        t.digitalMktg || '',
        t.web || '',
        t.remarks || ''
      ]);

      autoTable(doc, {
        head: salesHeaders,
        body: salesRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 60 },
          1: { width: 18, halign: 'center' },
          2: { width: 22, halign: 'center' },
          3: { width: 22, halign: 'center' },
          4: { width: 60 }
        },
        margin: { left: 14, right: 14 }
      });

      // Page break to start Page 2 fresh
      doc.addPage();
      currentY = 15;

      // 3. DAILY OPERATIONS SUMMARY
      drawSectionHeader("3. DAILY OPERATIONS SUMMARY");
      
      const opsHeaders = [["Activity", "Status", "Remarks"]];
      const opsRows = dailyOperations.map(t => [
        t.activity || '',
        t.status || '',
        t.remarks || ''
      ]);
      
      // Append extra row for Reports Collected
      opsRows.push([
        "Reports Collected from Team",
        reportsCollectedDone ? "Done" : "Pending",
        ""
      ]);

      autoTable(doc, {
        head: opsHeaders,
        body: opsRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 70 },
          1: { width: 35, halign: 'center' },
          2: { width: 77 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 4. PERFORMANCE KPI
      drawSectionHeader("4. PERFORMANCE KPI");
      
      const kpiHeaders = [["KPI", "Target", "Achieved"]];
      const kpiRows = performanceKpis.map(t => [
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
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 70 },
          1: { width: 56, halign: 'center' },
          2: { width: 56, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 5. ISSUES & FEEDBACK
      drawSectionHeader("5. ISSUES & FEEDBACK");
      
      const issueHeaders = [["Issue", "Priority", "Support Needed"]];
      const issueRows = issuesFeedback.map(t => [
        t.issue || '',
        t.priority || '',
        t.supportNeeded || ''
      ]);

      autoTable(doc, {
        head: issueHeaders,
        body: issueRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 70 },
          1: { width: 35, halign: 'center' },
          2: { width: 77 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 6. FINAL HANDOVER & APPROVAL
      drawSectionHeader("6. FINAL HANDOVER & APPROVAL");
      
      const handoverHeaders = [["Handover Item", "Status"]];
      const handoverRows = [
        ["CRM Updated", finalHandover.crmUpdated || 'No'],
        ["Reports Submitted", finalHandover.reportsSubmitted || 'No']
      ];

      autoTable(doc, {
        head: handoverHeaders,
        body: handoverRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 91 },
          1: { width: 91, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // Approvals Signature Table
      const approvalHeaders = [["Name", "Signature", "Date"]];
      const approvalRows = [
        [
          `Academic Counselor: ${approval.counselorName || ''}`,
          approval.counselorSignature || '',
          approval.counselorDate || ''
        ],
        [
          `Manager: ${approval.managerName || ''}`,
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

      doc.save(`Daily_Shift_Report_Counseling_${basicDetails.employeeName || 'Counselor'}_${selectedDate}.pdf`);
      showToast("PDF report downloaded successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to generate PDF.", "error");
    }
  };

  const parseNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const clean = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const handleFetchMonthlyData = async () => {
    if (!selectedUserId) {
      showToast("Please select a counselor first.", "error");
      return;
    }
    setIsMonthlyLoading(true);
    try {
      const start = new Date(monthlyStartDate);
      const end = new Date(monthlyEndDate);
      const dates = [];
      let temp = new Date(start);
      while (temp <= end) {
        dates.push(temp.toISOString().split('T')[0]);
        temp.setDate(temp.getDate() + 1);
      }

      if (dates.length === 0) {
        showToast("Invalid date range.", "error");
        return;
      }

      const fetchedResults = await Promise.all(
        dates.map(async (d) => {
          try {
            const res = await fetch(`${API_BASE}/v1/academic-counselor-reports/by-date?userId=${selectedUserId}&dateString=${d}`, {
              headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success && data.data) {
              return data.data;
            }
          } catch (err) {
            console.error(`Error fetching for date ${d}:`, err);
          }
          return null;
        })
      );

      const validReports = fetchedResults.filter(Boolean);
      if (validReports.length === 0) {
        showToast("No reports found in the selected date range.", "warning");
      }

      const lastReport = validReports[validReports.length - 1];
      const details = lastReport?.basicDetails || basicDetails;
      setMonthlyBasicDetails({
        employeeName: details.employeeName || '',
        designation: details.designation || 'Sales Executive / Tele Caller & Academic Counselor',
        department: details.department || 'Sales & Growth / Academy',
        shiftTiming: details.shiftTiming || '9:00 AM - 5.00 PM',
        reportingTo: details.reportingTo || 'Manager - OPS Sales & Growth',
        dateRange: `${new Date(monthlyStartDate).toLocaleDateString('en-GB')} to ${new Date(monthlyEndDate).toLocaleDateString('en-GB')}`
      });

      const consolidatedSales = DEFAULT_SALES_ACTIVITY.map(item => {
        let totalCount = 0;
        let totalDigitalMktg = 0;
        let totalWeb = 0;
        const remarksList = [];

        validReports.forEach(report => {
          const activityItem = report.salesActivity?.find(a => a.activity === item.activity);
          if (activityItem) {
            totalCount += parseNumber(activityItem.count);
            totalDigitalMktg += parseNumber(activityItem.digitalMktg);
            totalWeb += parseNumber(activityItem.web);
            if (activityItem.remarks) remarksList.push(activityItem.remarks);
          }
        });

        return {
          activity: item.activity,
          count: totalCount || '',
          digitalMktg: totalDigitalMktg || '',
          web: totalWeb || '',
          remarks: Array.from(new Set(remarksList)).join('; ')
        };
      });
      setMonthlySalesActivity(consolidatedSales);

      const consolidatedKpis = DEFAULT_PERFORMANCE_KPIS.map(item => {
        let totalTarget = 0;
        let totalAchieved = 0;

        validReports.forEach(report => {
          const kpiItem = report.performanceKpis?.find(k => k.kpi === item.kpi);
          if (kpiItem) {
            totalTarget += parseNumber(kpiItem.target);
            totalAchieved += parseNumber(kpiItem.achieved);
          }
        });

        return {
          kpi: item.kpi,
          target: totalTarget || '',
          achieved: totalAchieved || ''
        };
      });
      setMonthlyPerformanceKpis(consolidatedKpis);

      const consolidatedOps = DEFAULT_DAILY_OPERATIONS.map(item => {
        const remarksList = [];
        let doneCount = 0;
        let pendingCount = 0;
        let naCount = 0;

        validReports.forEach(report => {
          const opsItem = report.dailyOperations?.find(o => o.activity === item.activity);
          if (opsItem) {
            if (opsItem.status === 'Done') doneCount++;
            else if (opsItem.status === 'Pending') pendingCount++;
            else naCount++;
            
            if (opsItem.remarks) remarksList.push(opsItem.remarks);
          }
        });

        let finalStatus = 'Done';
        if (pendingCount > 0) finalStatus = 'Pending';
        else if (doneCount === 0 && naCount > 0) finalStatus = 'NA';

        return {
          activity: item.activity,
          status: finalStatus,
          remarks: Array.from(new Set(remarksList)).join('; ')
        };
      });
      setMonthlyDailyOperations(consolidatedOps);

      const collectedCount = validReports.filter(r => r.reportsCollectedDone).length;
      setMonthlyReportsCollectedDone(collectedCount > 0);

      const mergedIssues = [];
      validReports.forEach(report => {
        if (Array.isArray(report.issuesFeedback)) {
          report.issuesFeedback.forEach(issue => {
            if (issue.issue) {
              mergedIssues.push({
                issue: issue.issue,
                priority: issue.priority || 'Medium',
                supportNeeded: issue.supportNeeded || ''
              });
            }
          });
        }
      });
      if (mergedIssues.length === 0) {
        mergedIssues.push({ issue: '', priority: 'Medium', supportNeeded: '' });
      }
      setMonthlyIssuesFeedback(mergedIssues);

      showToast(`Successfully consolidated ${validReports.length} reports!`, 'success');
    } catch (error) {
      console.error("Consolidation error:", error);
      showToast("Failed to fetch and consolidate data.", "error");
    } finally {
      setIsMonthlyLoading(false);
    }
  };

  const handleFetchAndConsolidate = async () => {
    await handleFetchMonthlyData();
    setIsMonthlyConsolidated(true);
    setMonthlyActiveTab('basicDetails');
  };

  const handleDownloadMonthlyPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let currentY = 15;
      
      const drawSectionHeader = (title) => {
        doc.setFillColor(60, 35, 117);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), 17, currentY + 5);
        currentY += 7;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(132, 204, 22);
      doc.text("KOD.", 14, 21);
      
      doc.setTextColor(60, 35, 117);
      doc.text("brand", 34, 21);

      doc.setFontSize(14);
      doc.setTextColor(60, 35, 117);
      doc.text("MONTHLY CONSOLIDATED REPORT", 100, 16);
      
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text("SALES EXECUTIVE / TELE CALLER & ACADEMIC COUNSELOR", 100, 22);

      currentY = 27;

      drawSectionHeader("1. BASIC DETAILS");
      
      const basicDetailsRows = [
        ["Date Range", monthlyBasicDetails.dateRange || '', "Employee Name", monthlyBasicDetails.employeeName || ''],
        ["Designation", monthlyBasicDetails.designation || '', "Department", monthlyBasicDetails.department || ''],
        ["Shift Timing", monthlyBasicDetails.shiftTiming || '', "Reporting To", monthlyBasicDetails.reportingTo || '']
      ];

      autoTable(doc, {
        body: basicDetailsRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 30 },
          1: { width: 61 },
          2: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 30 },
          3: { width: 61 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("2. COURSE COUNSELING & SALES ACTIVITY (CONSOLIDATED)");
      
      const salesHeaders = [["Activity", "Count", "Digital Mktg", "Web", "Remarks"]];
      const salesRows = monthlySalesActivity.map(t => [
        t.activity || '',
        t.count || '',
        t.digitalMktg || '',
        t.web || '',
        t.remarks || ''
      ]);

      autoTable(doc, {
        head: salesHeaders,
        body: salesRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 60 },
          1: { width: 18, halign: 'center' },
          2: { width: 22, halign: 'center' },
          3: { width: 22, halign: 'center' },
          4: { width: 60 }
        },
        margin: { left: 14, right: 14 }
      });

      doc.addPage();
      currentY = 15;

      drawSectionHeader("3. OPERATIONS SUMMARY (CONSOLIDATED)");
      
      const opsHeaders = [["Activity", "Status", "Remarks"]];
      const opsRows = monthlyDailyOperations.map(t => [
        t.activity || '',
        t.status || '',
        t.remarks || ''
      ]);
      
      opsRows.push([
        "Reports Collected from Team",
        monthlyReportsCollectedDone ? "Done" : "Pending",
        ""
      ]);

      autoTable(doc, {
        head: opsHeaders,
        body: opsRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 70 },
          1: { width: 35, halign: 'center' },
          2: { width: 77 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("4. PERFORMANCE KPI (CONSOLIDATED)");
      
      const kpiHeaders = [["KPI", "Target", "Achieved"]];
      const kpiRows = monthlyPerformanceKpis.map(t => [
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
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 70 },
          1: { width: 56, halign: 'center' },
          2: { width: 56, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("5. ISSUES & FEEDBACK (CONSOLIDATED)");
      
      const issueHeaders = [["Issue", "Priority", "Support Needed"]];
      const issueRows = monthlyIssuesFeedback.map(t => [
        t.issue || '',
        t.priority || '',
        t.supportNeeded || ''
      ]);

      autoTable(doc, {
        head: issueHeaders,
        body: issueRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 70 },
          1: { width: 35, halign: 'center' },
          2: { width: 77 }
        },
        margin: { left: 14, right: 14 }
      });

      doc.save(`Monthly_Consolidated_Report_Counseling_${monthlyBasicDetails.employeeName || 'Counselor'}_${monthlyStartDate}_to_${monthlyEndDate}.pdf`);
      showToast("Monthly PDF report downloaded successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to generate monthly PDF.", "error");
    }
  };

  const addMonthlyIssueRow = () => {
    setMonthlyIssuesFeedback([...monthlyIssuesFeedback, { issue: '', priority: 'Medium', supportNeeded: '' }]);
  };

  const removeMonthlyIssueRow = (index) => {
    if (monthlyIssuesFeedback.length > 1) {
      setMonthlyIssuesFeedback(monthlyIssuesFeedback.filter((_, i) => i !== index));
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
  const addIssueRow = () => {
    setIssuesFeedback([...issuesFeedback, { issue: '', priority: 'Medium', supportNeeded: '' }]);
  };

  const removeIssueRow = (index) => {
    if (issuesFeedback.length > 1) {
      setIssuesFeedback(issuesFeedback.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* LEFT PANEL: Date Select Sidebar */}
      <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-5 shadow-sm">
        
        {(isPrivileged || counselors.length > 1) && (
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Counselor User
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
              >
                <option value="">-- Select Counselor --</option>
                {counselors.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.employeeId || 'No ID'})
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
            {/* Form Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Academic Counselor Shift Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill daily course counseling logs, verify team metrics, and download reports.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMonthlyModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all"
                >
                  <Calendar size={16} />
                  Monthly Report
                </button>

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
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">1</span>
                  Basic Details
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditingBasic(!isEditingBasic)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                >
                  {isEditingBasic ? (
                    <>
                      <CheckCircle size={14} /> Done
                    </>
                  ) : (
                    <>
                      <Pencil size={14} /> Edit
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="text"
                    value={basicDetails.date || ''}
                    readOnly={true}
                    disabled={true}
                    className="w-full bg-slate-100/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-900 rounded-xl px-3 py-2 text-sm text-slate-450 dark:text-slate-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Day</label>
                  <input
                    type="text"
                    value={basicDetails.day || ''}
                    readOnly={true}
                    disabled={true}
                    className="w-full bg-slate-100/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-900 rounded-xl px-3 py-2 text-sm text-slate-450 dark:text-slate-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee Name</label>
                  <input
                    type="text"
                    value={basicDetails.employeeName || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, employeeName: e.target.value })}
                    readOnly={!isEditingBasic}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isEditingBasic ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={basicDetails.designation || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, designation: e.target.value })}
                    readOnly={!isEditingBasic}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isEditingBasic ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                  <input
                    type="text"
                    value={basicDetails.department || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, department: e.target.value })}
                    readOnly={!isEditingBasic}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isEditingBasic ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Shift Timing</label>
                  <input
                    type="text"
                    value={basicDetails.shiftTiming || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, shiftTiming: e.target.value })}
                    readOnly={!isEditingBasic}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isEditingBasic ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Reporting Manager</label>
                  <input
                    type="text"
                    value={basicDetails.reportingTo || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, reportingTo: e.target.value })}
                    readOnly={!isEditingBasic}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isEditingBasic ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                  />
                </div>
              </div>
            </div>

            {/* 2. DAILY COURSE COUNSELING & SALES ACTIVITY */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">2</span>
                Daily Course Counseling & Sales Activity
              </h2>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[35%]">Activity</th>
                      <th className="px-5 py-4 w-[15%] text-center">Count</th>
                      <th className="px-5 py-4 w-[15%] text-center">Digital Mktg</th>
                      <th className="px-5 py-4 w-[15%] text-center">Web</th>
                      <th className="px-5 py-4 w-[20%]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesActivity.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">{item.activity}</td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.count}
                            onChange={(e) => {
                              const updated = [...salesActivity];
                              updated[index].count = e.target.value;
                              setSalesActivity(updated);
                            }}
                            placeholder="-"
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.digitalMktg}
                            onChange={(e) => {
                              const updated = [...salesActivity];
                              updated[index].digitalMktg = e.target.value;
                              setSalesActivity(updated);
                            }}
                            placeholder="-"
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.web}
                            onChange={(e) => {
                              const updated = [...salesActivity];
                              updated[index].web = e.target.value;
                              setSalesActivity(updated);
                            }}
                            placeholder="-"
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => {
                              const updated = [...salesActivity];
                              updated[index].remarks = e.target.value;
                              setSalesActivity(updated);
                            }}
                            placeholder="Remarks..."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. DAILY OPERATIONS SUMMARY */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">3</span>
                Daily Operations Summary
              </h2>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[40%]">Activity</th>
                      <th className="px-5 py-4 w-[25%] text-center">Status</th>
                      <th className="px-5 py-4 w-[35%]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dailyOperations.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">{item.activity}</td>
                        <td className="px-5 py-3 text-center">
                          <select
                            value={item.status}
                            onChange={(e) => {
                              const updated = [...dailyOperations];
                              updated[index].status = e.target.value;
                              setDailyOperations(updated);
                            }}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                          >
                            <option value="Done">Done</option>
                            <option value="Pending">Pending</option>
                            <option value="NA">NA</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => {
                              const updated = [...dailyOperations];
                              updated[index].remarks = e.target.value;
                              setDailyOperations(updated);
                            }}
                            placeholder="Add details..."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                      </tr>
                    ))}
                    {/* Inline Reports Collected row */}
                    <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5">
                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">Reports Collected from Team</td>
                      <td className="px-5 py-4 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reportsCollectedDone}
                            onChange={(e) => setReportsCollectedDone(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Done</span>
                        </label>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-slate-400">Select if team submissions are fully gathered.</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. PERFORMANCE KPI */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4</span>
                Performance KPI
              </h2>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[40%]">KPI</th>
                      <th className="px-5 py-4 w-[30%] text-center">Target</th>
                      <th className="px-5 py-4 w-[30%] text-center">Achieved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {performanceKpis.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">{item.kpi}</td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.target}
                            onChange={(e) => {
                              const updated = [...performanceKpis];
                              updated[index].target = e.target.value;
                              setPerformanceKpis(updated);
                            }}
                            placeholder="Target count..."
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={item.achieved}
                            onChange={(e) => {
                              const updated = [...performanceKpis];
                              updated[index].achieved = e.target.value;
                              setPerformanceKpis(updated);
                            }}
                            placeholder="Actual count..."
                            className="w-full bg-transparent border-none text-center focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. ISSUES & FEEDBACK */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">5</span>
                  Issues & Feedback
                </h2>
                <button
                  type="button"
                  onClick={addIssueRow}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-4 w-[40%]">Issue</th>
                      <th className="px-5 py-4 w-[25%] text-center">Priority</th>
                      <th className="px-5 py-4 w-[30%]">Support Needed</th>
                      <th className="px-5 py-4 w-[5%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issuesFeedback.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.issue}
                            onChange={(e) => {
                              const updated = [...issuesFeedback];
                              updated[index].issue = e.target.value;
                              setIssuesFeedback(updated);
                            }}
                            placeholder="Describe issue..."
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <select
                            value={item.priority}
                            onChange={(e) => {
                              const updated = [...issuesFeedback];
                              updated[index].priority = e.target.value;
                              setIssuesFeedback(updated);
                            }}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={item.supportNeeded}
                            onChange={(e) => {
                              const updated = [...issuesFeedback];
                              updated[index].supportNeeded = e.target.value;
                              setIssuesFeedback(updated);
                            }}
                            placeholder="What help is required?"
                            className="w-full bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeIssueRow(index)}
                            disabled={issuesFeedback.length === 1}
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

            {/* 6. FINAL HANDOVER & APPROVAL */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">6</span>
                Final Handover & Approval
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                
                {/* Handover checklists */}
                <div className="space-y-4 border-r border-slate-200/50 dark:border-slate-800/50 pr-0 lg:pr-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Handover Items</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">CRM Updated</span>
                      <select
                        value={finalHandover.crmUpdated}
                        onChange={(e) => setFinalHandover({ ...finalHandover, crmUpdated: e.target.value })}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reports Submitted</span>
                      <select
                        value={finalHandover.reportsSubmitted}
                        onChange={(e) => setFinalHandover({ ...finalHandover, reportsSubmitted: e.target.value })}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signatures</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Academic Counselor Name</label>
                      <input
                        type="text"
                        value={approval.counselorName || ''}
                        onChange={(e) => setApproval({ ...approval, counselorName: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Counselor Initials / Sign</label>
                      <input
                        type="text"
                        value={approval.counselorSignature || ''}
                        onChange={(e) => setApproval({ ...approval, counselorSignature: e.target.value })}
                        placeholder="Sign..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Date</label>
                      <input
                        type="text"
                        value={approval.counselorDate || ''}
                        onChange={(e) => setApproval({ ...approval, counselorDate: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Manager Name</label>
                      <input
                        type="text"
                        value={approval.managerName || ''}
                        onChange={(e) => setApproval({ ...approval, managerName: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </motion.div>
        )}
      </div>

      {/* Monthly Consolidation Modal */}
      <AnimatePresence>
        {isMonthlyModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-center items-start pt-10 overflow-y-auto bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col mb-10 text-slate-700 dark:text-slate-200"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-indigo-500" size={18} />
                    Monthly Consolidated Report
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consolidate daily shift reports for counselor: {counselors.find(c => c._id === selectedUserId)?.name || basicDetails.employeeName || 'Selected User'}
                  </p>
                </div>
                <button
                  onClick={() => setIsMonthlyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-2xl font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Modal Tabs / Controls */}
              <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setMonthlyActiveTab('range')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    monthlyActiveTab === 'range'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  1. Date Range
                </button>
                
                {isMonthlyConsolidated && (
                  <>
                    <button
                      onClick={() => setMonthlyActiveTab('basicDetails')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        monthlyActiveTab === 'basicDetails'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      2. Basic Details
                    </button>
                    <button
                      onClick={() => setMonthlyActiveTab('salesActivity')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        monthlyActiveTab === 'salesActivity'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      3. Sales Activity
                    </button>
                    <button
                      onClick={() => setMonthlyActiveTab('dailyOperations')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        monthlyActiveTab === 'dailyOperations'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      4. Daily Operations
                    </button>
                    <button
                      onClick={() => setMonthlyActiveTab('performanceKpis')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        monthlyActiveTab === 'performanceKpis'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      5. Performance KPIs
                    </button>
                    <button
                      onClick={() => setMonthlyActiveTab('issuesFeedback')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        monthlyActiveTab === 'issuesFeedback'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      6. Issues & Feedback
                    </button>
                  </>
                )}
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {monthlyActiveTab === 'range' && (
                  <div className="space-y-6 max-w-xl mx-auto py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={monthlyStartDate}
                          onChange={(e) => setMonthlyStartDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={monthlyEndDate}
                          onChange={(e) => setMonthlyEndDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={handleFetchAndConsolidate}
                        disabled={isMonthlyLoading}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-md shadow-indigo-600/10"
                      >
                        {isMonthlyLoading ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Consolidating...
                          </>
                        ) : (
                          <>
                            <FileText size={16} />
                            Fetch & Consolidate Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {isMonthlyConsolidated && (
                  <>
                    {monthlyActiveTab === 'basicDetails' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Date Range</label>
                          <input
                            type="text"
                            value={monthlyBasicDetails.dateRange || ''}
                            onChange={(e) => setMonthlyBasicDetails({ ...monthlyBasicDetails, dateRange: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee Name</label>
                          <input
                            type="text"
                            value={monthlyBasicDetails.employeeName || ''}
                            onChange={(e) => setMonthlyBasicDetails({ ...monthlyBasicDetails, employeeName: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
                          <input
                            type="text"
                            value={monthlyBasicDetails.designation || ''}
                            onChange={(e) => setMonthlyBasicDetails({ ...monthlyBasicDetails, designation: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                          <input
                            type="text"
                            value={monthlyBasicDetails.department || ''}
                            onChange={(e) => setMonthlyBasicDetails({ ...monthlyBasicDetails, department: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Shift Timing</label>
                          <input
                            type="text"
                            value={monthlyBasicDetails.shiftTiming || ''}
                            onChange={(e) => setMonthlyBasicDetails({ ...monthlyBasicDetails, shiftTiming: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Reporting Manager</label>
                          <input
                            type="text"
                            value={monthlyBasicDetails.reportingTo || ''}
                            onChange={(e) => setMonthlyBasicDetails({ ...monthlyBasicDetails, reportingTo: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    {monthlyActiveTab === 'salesActivity' && (
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <th className="px-5 py-4 w-[35%]">Activity</th>
                              <th className="px-5 py-4 w-[15%] text-center">Count</th>
                              <th className="px-5 py-4 w-[15%] text-center">Digital Mktg</th>
                              <th className="px-5 py-4 w-[15%] text-center">Web</th>
                              <th className="px-5 py-4 w-[20%]">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {monthlySalesActivity.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                                <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">{item.activity}</td>
                                <td className="px-5 py-3 text-center">
                                  <input
                                    type="text"
                                    value={item.count}
                                    onChange={(e) => {
                                      const updated = [...monthlySalesActivity];
                                      updated[index].count = e.target.value;
                                      setMonthlySalesActivity(updated);
                                    }}
                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-center focus:outline-none text-slate-700 dark:text-slate-200 py-1"
                                  />
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <input
                                    type="text"
                                    value={item.digitalMktg}
                                    onChange={(e) => {
                                      const updated = [...monthlySalesActivity];
                                      updated[index].digitalMktg = e.target.value;
                                      setMonthlySalesActivity(updated);
                                    }}
                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-center focus:outline-none text-slate-700 dark:text-slate-200 py-1"
                                  />
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <input
                                    type="text"
                                    value={item.web}
                                    onChange={(e) => {
                                      const updated = [...monthlySalesActivity];
                                      updated[index].web = e.target.value;
                                      setMonthlySalesActivity(updated);
                                    }}
                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-center focus:outline-none text-slate-700 dark:text-slate-200 py-1"
                                  />
                                </td>
                                <td className="px-5 py-3">
                                  <input
                                    type="text"
                                    value={item.remarks}
                                    onChange={(e) => {
                                      const updated = [...monthlySalesActivity];
                                      updated[index].remarks = e.target.value;
                                      setMonthlySalesActivity(updated);
                                    }}
                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-slate-700 dark:text-slate-200 px-2 py-1"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {monthlyActiveTab === 'dailyOperations' && (
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <th className="px-5 py-4 w-[40%]">Activity</th>
                              <th className="px-5 py-4 w-[25%] text-center">Status</th>
                              <th className="px-5 py-4 w-[35%]">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {monthlyDailyOperations.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                                <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">{item.activity}</td>
                                <td className="px-5 py-3 text-center">
                                  <select
                                    value={item.status}
                                    onChange={(e) => {
                                      const updated = [...monthlyDailyOperations];
                                      updated[index].status = e.target.value;
                                      setMonthlyDailyOperations(updated);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                                  >
                                    <option value="Done">Done</option>
                                    <option value="Pending">Pending</option>
                                    <option value="NA">NA</option>
                                  </select>
                                </td>
                                <td className="px-5 py-3">
                                  <input
                                    type="text"
                                    value={item.remarks}
                                    onChange={(e) => {
                                      const updated = [...monthlyDailyOperations];
                                      updated[index].remarks = e.target.value;
                                      setMonthlyDailyOperations(updated);
                                    }}
                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-slate-700 dark:text-slate-200 px-2 py-1"
                                  />
                                </td>
                              </tr>
                            ))}
                            <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5">
                              <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">Reports Collected from Team</td>
                              <td className="px-5 py-4 text-center">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={monthlyReportsCollectedDone}
                                    onChange={(e) => setMonthlyReportsCollectedDone(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                  />
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Done</span>
                                </label>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-xs text-slate-400">Select if team submissions are fully gathered.</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {monthlyActiveTab === 'performanceKpis' && (
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <th className="px-5 py-4 w-[40%]">KPI</th>
                              <th className="px-5 py-4 w-[30%] text-center">Target</th>
                              <th className="px-5 py-4 w-[30%] text-center">Achieved</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {monthlyPerformanceKpis.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                                <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">{item.kpi}</td>
                                <td className="px-5 py-3 text-center">
                                  <input
                                    type="text"
                                    value={item.target}
                                    onChange={(e) => {
                                      const updated = [...monthlyPerformanceKpis];
                                      updated[index].target = e.target.value;
                                      setMonthlyPerformanceKpis(updated);
                                    }}
                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-center focus:outline-none text-slate-700 dark:text-slate-200 py-1"
                                  />
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <input
                                    type="text"
                                    value={item.achieved}
                                    onChange={(e) => {
                                      const updated = [...monthlyPerformanceKpis];
                                      updated[index].achieved = e.target.value;
                                      setMonthlyPerformanceKpis(updated);
                                    }}
                                    className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-center focus:outline-none text-slate-700 dark:text-slate-200 py-1"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {monthlyActiveTab === 'issuesFeedback' && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={addMonthlyIssueRow}
                            className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-lime-400 hover:opacity-80 font-bold transition-all"
                          >
                            <Plus size={14} /> Add Row
                          </button>
                        </div>
                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                <th className="px-5 py-4 w-[40%]">Issue</th>
                                <th className="px-5 py-4 w-[25%] text-center">Priority</th>
                                <th className="px-5 py-4 w-[30%]">Support Needed</th>
                                <th className="px-5 py-4 w-[5%] text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {monthlyIssuesFeedback.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors">
                                  <td className="px-5 py-3">
                                    <input
                                      type="text"
                                      value={item.issue}
                                      onChange={(e) => {
                                        const updated = [...monthlyIssuesFeedback];
                                        updated[index].issue = e.target.value;
                                        setMonthlyIssuesFeedback(updated);
                                      }}
                                      className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-slate-700 dark:text-slate-200 px-2 py-1"
                                    />
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <select
                                      value={item.priority}
                                      onChange={(e) => {
                                        const updated = [...monthlyIssuesFeedback];
                                        updated[index].priority = e.target.value;
                                        setMonthlyIssuesFeedback(updated);
                                      }}
                                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                                    >
                                      <option value="High">High</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Low">Low</option>
                                    </select>
                                  </td>
                                  <td className="px-5 py-3">
                                    <input
                                      type="text"
                                      value={item.supportNeeded}
                                      onChange={(e) => {
                                        const updated = [...monthlyIssuesFeedback];
                                        updated[index].supportNeeded = e.target.value;
                                        setMonthlyIssuesFeedback(updated);
                                      }}
                                      className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none text-slate-700 dark:text-slate-200 px-2 py-1"
                                    />
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeMonthlyIssueRow(index)}
                                      disabled={monthlyIssuesFeedback.length === 1}
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
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <button
                  onClick={() => setIsMonthlyModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-355 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all bg-white dark:bg-slate-900"
                >
                  Close
                </button>

                {isMonthlyConsolidated && (
                  <button
                    onClick={handleDownloadMonthlyPDF}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/10"
                  >
                    <Download size={16} />
                    Download Monthly PDF
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AcademicCounselorReportPage;
