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
const DEFAULT_ACCOUNTING_SUMMARY = [
  { activity: 'Daily Entries Updated', status: 'Done', remarks: 'All entries completed' },
  { activity: 'Cash Book Updated', status: 'Done', remarks: 'All entries completed' },
  { activity: 'Bank Transactions Verified', status: 'No', remarks: 'No more entries added' },
  { activity: 'Invoices Generated', status: 'No', remarks: 'No more entries added' },
  { activity: 'Payment Follow-up Completed', status: 'No', remarks: 'No more entries added' },
  { activity: 'Expense Records Updated', status: 'Done', remarks: 'All entries completed' }
];

const DEFAULT_TRANSACTIONS = [
  { transactionType: 'Cash', count: '1', amount: '4,000.00' },
  { transactionType: 'UPI', count: '0', amount: '-' },
  { transactionType: 'Bank Transfer', count: '0', amount: '-' },
  { transactionType: 'Client Payments', count: '0', amount: '-' },
  { transactionType: 'Vendor Payments', count: '0', amount: '-' }
];

const DEFAULT_PAYROLL_STATUS = [
  { activity: 'Salary Processing', status: '', remarks: '' },
  { activity: 'Freelancer Payments', status: '', remarks: '' },
  { activity: 'Incentives', status: '', remarks: '' },
  { activity: 'Reimbursements', status: '', remarks: '' }
];

const DEFAULT_EXPENSES = [
  { category: 'Office', amount: '4,000.00', remarks: 'ADVANCE SALARY' },
  { category: 'Marketing', amount: '', remarks: '' },
  { category: 'Utilities', amount: '', remarks: '' },
  { category: 'Software', amount: '', remarks: '' },
  { category: 'Misc', amount: '', remarks: '' }
];

const DEFAULT_COMPLIANCE = [
  { activity: 'Receipts Uploaded', status: 'Done' },
  { activity: 'Ledger Updated', status: 'No' },
  { activity: 'Bank Statements Filed', status: 'No' },
  { activity: 'Tax Docs Updated', status: 'No' },
  { activity: 'Backup Completed', status: 'No' }
];

const DEFAULT_KPI = [
  { kpi: 'Entries Completed', targetAchieved: '' },
  { kpi: 'Invoices', targetAchieved: '' },
  { kpi: 'Follow-ups', targetAchieved: '' },
  { kpi: 'Accuracy', targetAchieved: '' }
];

const DEFAULT_HANDOVER = [
  { item: 'Entries Updated', status: 'Done' },
  { item: 'Reports Submitted', status: 'Done' },
  { item: 'Files Uploaded', status: 'Done' },
  { item: 'Pending Payments Shared', status: '' }
];

const AccountantReportPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isPrivileged, setIsPrivileged] = useState(false);

  // Selection states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [accountantStaff, setAccountantStaff] = useState([]);
  const [submittedDates, setSubmittedDates] = useState([]);

  // Form States
  const [basicDetails, setBasicDetails] = useState({
    date: '',
    day: '',
    employeeName: '',
    employeeId: '',
    department: 'Accounts & Finance',
    designation: 'Accountant / Accounts Executive',
    shiftTiming: '9:00 TO 05:00',
    reportingTo: 'Accounts Manager / COO',
    preparedTime: ''
  });

  const [dailyAccountingSummary, setDailyAccountingSummary] = useState(DEFAULT_ACCOUNTING_SUMMARY);
  const [transactionReport, setTransactionReport] = useState(DEFAULT_TRANSACTIONS);
  const [invoiceBillingReport, setInvoiceBillingReport] = useState([]);
  const [payrollPaymentStatus, setPayrollPaymentStatus] = useState(DEFAULT_PAYROLL_STATUS);
  const [expenseTracking, setExpenseTracking] = useState(DEFAULT_EXPENSES);
  const [documentationCompliance, setDocumentationCompliance] = useState(DEFAULT_COMPLIANCE);
  const [kpiTracking, setKpiTracking] = useState(DEFAULT_KPI);
  const [issuesSupportRequired, setIssuesSupportRequired] = useState([]);
  const [nextDayTaskPlan, setNextDayTaskPlan] = useState(['', '', '', '']);
  const [finalShiftHandover, setFinalShiftHandover] = useState(DEFAULT_HANDOVER);
  const [accountantComments, setAccountantComments] = useState('');
  
  const [approval, setApproval] = useState({
    accountantName: '',
    accountantSignature: '',
    accountantDate: '',
    managerName: 'Accounts Manager / COO Approval',
    managerSignature: '',
    managerDate: ''
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

  // Fetch Accountant Staff (For Admins)
  useEffect(() => {
    if (isPrivileged) {
      const fetchAccountants = async () => {
        try {
          const res = await fetch(`${API_BASE}/v1/accountant-reports/accountant-staff`, {
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setAccountantStaff(data.data);
            if (data.data.length > 0 && !selectedUserId) {
              setSelectedUserId(data.data[0]._id);
            }
          }
        } catch (e) {
          console.error("Failed to fetch accountant staff list:", e);
        }
      };
      fetchAccountants();
    }
  }, [isPrivileged, getAuthHeaders, selectedUserId]);

  // Fetch submitted dates
  const fetchSubmittedDates = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/accountant-reports/submitted-dates?userId=${userId}`, {
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

  // Fetch Accountant report data
  const fetchReport = useCallback(async (userId, dateStr) => {
    if (!userId || !dateStr) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/accountant-reports/by-date?userId=${userId}&dateString=${dateStr}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && data.data) {
        const report = data.data;
        setBasicDetails(report.basicDetails || {});
        setDailyAccountingSummary(report.dailyAccountingSummary || []);
        setTransactionReport(report.transactionReport || []);
        setInvoiceBillingReport(report.invoiceBillingReport || []);
        setPayrollPaymentStatus(report.payrollPaymentStatus || []);
        setExpenseTracking(report.expenseTracking || []);
        setDocumentationCompliance(report.documentationCompliance || []);
        setKpiTracking(report.kpiTracking || []);
        setIssuesSupportRequired(report.issuesSupportRequired || []);
        
        let plan = report.nextDayTaskPlan || [];
        while (plan.length < 4) plan.push('');
        setNextDayTaskPlan(plan);

        setFinalShiftHandover(report.finalShiftHandover || []);
        setAccountantComments(report.accountantComments || '');
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
    if (isPrivileged && accountantStaff.length > 0) {
      userDetail = accountantStaff.find(u => u._id === userId) || currentUser;
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
    const timeStr = `${hours}.${minutes} ${ampm}`;

    setBasicDetails({
      date: formattedDateString,
      day: dayName.toUpperCase(),
      employeeName: userDetail.name || '',
      employeeId: userDetail.employeeId || '',
      department: 'Accounts & Finance',
      designation: userDetail.designation || 'Accountant / Accounts Executive',
      shiftTiming: '9:00 TO 05:00',
      reportingTo: 'Accounts Manager / COO',
      preparedTime: timeStr
    });

    setDailyAccountingSummary(DEFAULT_ACCOUNTING_SUMMARY);
    setTransactionReport(DEFAULT_TRANSACTIONS);
    setInvoiceBillingReport([]);
    setPayrollPaymentStatus(DEFAULT_PAYROLL_STATUS);
    setExpenseTracking(DEFAULT_EXPENSES);
    setDocumentationCompliance(DEFAULT_COMPLIANCE);
    setKpiTracking(DEFAULT_KPI);
    setIssuesSupportRequired([]);
    setNextDayTaskPlan(['', '', '', '']);
    setFinalShiftHandover(DEFAULT_HANDOVER);
    setAccountantComments('');
    setApproval({
      accountantName: userDetail.name || '',
      accountantSignature: '',
      accountantDate: formattedDateString,
      managerName: 'Accounts Manager / COO Approval',
      managerSignature: '',
      managerDate: ''
    });
  };

  const handleSaveReport = async () => {
    try {
      setSaving(true);
      const payload = {
        userId: selectedUserId,
        dateString: selectedDate,
        basicDetails,
        dailyAccountingSummary,
        transactionReport,
        invoiceBillingReport,
        payrollPaymentStatus,
        expenseTracking,
        documentationCompliance,
        kpiTracking,
        issuesSupportRequired,
        nextDayTaskPlan,
        finalShiftHandover,
        accountantComments,
        approval
      };

      const res = await fetch(`${API_BASE}/v1/accountant-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Accountant Daily Shift Report saved successfully!", 'success');
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
        doc.text("ACCOUNTANT / ACCOUNTS EXECUTIVE", 130, 22);
      };

      // ================= PAGE 1 =================
      drawHeader();
      currentY = 27;

      // 1. BASIC DETAILS
      drawSectionHeader("1. BASIC DETAILS");
      const basicDetailsRows = [
        ["Date", basicDetails.date || ''],
        ["Day", basicDetails.day || ''],
        ["Employee Name", basicDetails.employeeName || ''],
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

      // 2. DAILY ACCOUNTING SUMMARY
      drawSectionHeader("2. DAILY ACCOUNTING SUMMARY");
      const summaryHeaders = [["Activity", "Status", "Remarks"]];
      const summaryRows = dailyAccountingSummary.map(o => [o.activity || '', o.status || '', o.remarks || '']);

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

      // 3. TRANSACTION REPORT
      drawSectionHeader("3. TRANSACTION REPORT");
      const transactionHeaders = [["Transaction Type", "Count", "Amount"]];
      const transactionRows = transactionReport.map(t => [t.transactionType || '', t.count || '', t.amount || '']);

      autoTable(doc, {
        head: transactionHeaders,
        body: transactionRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 80 },
          1: { width: 42, halign: 'center' },
          2: { width: 60, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      // ================= PAGE 2 =================
      doc.addPage();
      currentY = 15;
      drawHeader();
      currentY = 27;

      // 4. INVOICE & BILLING REPORT
      drawSectionHeader("4. INVOICE & BILLING REPORT");
      const invoiceHeaders = [["Client/Vendor", "Type", "Amount", "Status", "Remarks"]];
      const invoiceRows = invoiceBillingReport.length > 0 
        ? invoiceBillingReport.map(i => [i.clientVendor || '', i.type || '', i.amount || '', i.status || '', i.remarks || ''])
        : [["No invoices logged", "", "", "", ""]];

      autoTable(doc, {
        head: invoiceHeaders,
        body: invoiceRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 50 },
          1: { width: 25 },
          2: { width: 30, halign: 'right' },
          3: { width: 30, halign: 'center' },
          4: { width: 47 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 5. PAYROLL & PAYMENT STATUS
      drawSectionHeader("5. PAYROLL & PAYMENT STATUS");
      const payrollHeaders = [["Activity", "Status", "Remarks"]];
      const payrollRows = payrollPaymentStatus.map(p => [p.activity || '', p.status || '', p.remarks || '']);

      autoTable(doc, {
        head: payrollHeaders,
        body: payrollRows,
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

      // 6. EXPENSE TRACKING
      drawSectionHeader("6. EXPENSE TRACKING");
      const expenseHeaders = [["Expense Category", "Amount", "Remarks"]];
      const expenseRows = expenseTracking.map(e => [e.category || '', e.amount || '', e.remarks || '']);

      autoTable(doc, {
        head: expenseHeaders,
        body: expenseRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 60 },
          1: { width: 40, halign: 'right' },
          2: { width: 82 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 7. DOCUMENTATION & COMPLIANCE
      drawSectionHeader("7. DOCUMENTATION & COMPLIANCE");
      const complianceHeaders = [["Activity", "Status"]];
      const complianceRows = documentationCompliance.map(c => [c.activity || '', c.status || '']);

      autoTable(doc, {
        head: complianceHeaders,
        body: complianceRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 120 },
          1: { width: 62, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      // ================= PAGE 3 =================
      doc.addPage();
      currentY = 15;
      drawHeader();
      currentY = 27;

      // 8. KPI TRACKING
      drawSectionHeader("8. KPI TRACKING");
      const kpiHeaders = [["KPI", "Target Achieved"]];
      const kpiRows = kpiTracking.map(k => [k.kpi || '', k.targetAchieved || '']);

      autoTable(doc, {
        head: kpiHeaders,
        body: kpiRows,
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

      // 9. ISSUES / SUPPORT REQUIRED
      drawSectionHeader("9. ISSUES / SUPPORT REQUIRED");
      const issuesHeaders = [["Issue", "Priority", "Action"]];
      const issuesRows = issuesSupportRequired.length > 0
        ? issuesSupportRequired.map(i => [i.issue || '', i.priority || '', i.action || ''])
        : [["No active issues logged", "", ""]];

      autoTable(doc, {
        head: issuesHeaders,
        body: issuesRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 80 },
          1: { width: 35, halign: 'center' },
          2: { width: 67 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 10. NEXT DAY TASK PLAN
      drawSectionHeader("10. NEXT DAY TASK PLAN");
      const planRows = nextDayTaskPlan.map((p, idx) => [`${idx + 1}.`, p || '']);

      autoTable(doc, {
        body: planRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 247], width: 15, halign: 'center' },
          1: { width: 167 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 11. FINAL SHIFT HANDOVER
      drawSectionHeader("11. FINAL SHIFT HANDOVER");
      const handoverHeaders = [["Handover Item", "Status"]];
      const handoverRows = finalShiftHandover.map(h => [h.item || '', h.status || '']);

      autoTable(doc, {
        head: handoverHeaders,
        body: handoverRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 120 },
          1: { width: 62, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      // 12. COMMENTS
      drawSectionHeader("12. ACCOUNTANT COMMENTS");
      const commentRows = [[accountantComments || 'No comments.']];
      autoTable(doc, {
        body: commentRows,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // 13. APPROVAL
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 35, 117);
      doc.text(approval.accountantName || '', 30, currentY);
      doc.text(approval.managerName || '', 130, currentY);

      doc.setDrawColor(60, 35, 117);
      doc.line(20, currentY + 1.5, 75, currentY + 1.5);
      doc.line(120, currentY + 1.5, 175, currentY + 1.5);

      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text("Accountant Signature & Date", 28, currentY + 5.5);
      doc.text("Manager Signature & Date", 132, currentY + 5.5);

      doc.save(`Accountant_Daily_Shift_Report_${basicDetails.employeeName || 'Accountant'}_${selectedDate}.pdf`);
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

  const handleInvoiceChange = (index, field, value) => {
    const updated = [...invoiceBillingReport];
    updated[index][field] = value;
    setInvoiceBillingReport(updated);
  };

  const addInvoiceRow = () => {
    setInvoiceBillingReport([
      ...invoiceBillingReport,
      { clientVendor: '', type: '', amount: '', status: '', remarks: '' }
    ]);
  };

  const removeInvoiceRow = (index) => {
    const updated = invoiceBillingReport.filter((_, idx) => idx !== index);
    setInvoiceBillingReport(updated);
  };

  const handleIssueChange = (index, field, value) => {
    const updated = [...issuesSupportRequired];
    updated[index][field] = value;
    setIssuesSupportRequired(updated);
  };

  const addIssueRow = () => {
    setIssuesSupportRequired([
      ...issuesSupportRequired,
      { issue: '', priority: '', action: '' }
    ]);
  };

  const removeIssueRow = (index) => {
    const updated = issuesSupportRequired.filter((_, idx) => idx !== index);
    setIssuesSupportRequired(updated);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT PANEL: Date Select Sidebar */}
      <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-5 shadow-sm">
        {isPrivileged && (
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Accountant Staff
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {accountantStaff.map(staff => (
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
                  Accountant Daily Shift Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill, review, and download daily accounting shift reports.
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

            {/* 2. DAILY ACCOUNTING SUMMARY */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">2</span>
                Daily Accounting Summary
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/3">Activity</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/4">Status</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {dailyAccountingSummary.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.activity}</td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.status || ''}
                            onChange={(e) => {
                              const updated = [...dailyAccountingSummary];
                              updated[idx].status = e.target.value;
                              setDailyAccountingSummary(updated);
                            }}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => {
                              const updated = [...dailyAccountingSummary];
                              updated[idx].remarks = e.target.value;
                              setDailyAccountingSummary(updated);
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

            {/* 3. TRANSACTION REPORT */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">3</span>
                Transaction Report
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/3">Transaction Type</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/4">Count</th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {transactionReport.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.transactionType}</td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.count || ''}
                            onChange={(e) => {
                              const updated = [...transactionReport];
                              updated[idx].count = e.target.value;
                              setTransactionReport(updated);
                            }}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.amount || ''}
                            onChange={(e) => {
                              const updated = [...transactionReport];
                              updated[idx].amount = e.target.value;
                              setTransactionReport(updated);
                            }}
                            className="w-full text-right bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. INVOICE & BILLING REPORT */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4</span>
                  Invoice & Billing Report
                </h2>
                <button
                  type="button"
                  onClick={addInvoiceRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-lime-400 dark:hover:text-lime-500 uppercase tracking-wider"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Client/Vendor</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-32">Type</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-36">Amount</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-36">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-3 py-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {invoiceBillingReport.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-slate-400 dark:text-slate-600 italic">
                          No invoices or bills logged. Click "Add Row" to create logs.
                        </td>
                      </tr>
                    ) : (
                      invoiceBillingReport.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.clientVendor || ''}
                              onChange={(e) => handleInvoiceChange(idx, 'clientVendor', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.type || ''}
                              onChange={(e) => handleInvoiceChange(idx, 'type', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.amount || ''}
                              onChange={(e) => handleInvoiceChange(idx, 'amount', e.target.value)}
                              className="w-full text-right bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none font-mono"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.status || ''}
                              onChange={(e) => handleInvoiceChange(idx, 'status', e.target.value)}
                              className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.remarks || ''}
                              onChange={(e) => handleInvoiceChange(idx, 'remarks', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeInvoiceRow(idx)}
                              className="text-rose-500 hover:text-rose-600 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. PAYROLL & PAYMENT STATUS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">5</span>
                Payroll & Payment Status
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/3">Activity</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/4">Status</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {payrollPaymentStatus.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.activity}</td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.status || ''}
                            onChange={(e) => {
                              const updated = [...payrollPaymentStatus];
                              updated[idx].status = e.target.value;
                              setPayrollPaymentStatus(updated);
                            }}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => {
                              const updated = [...payrollPaymentStatus];
                              updated[idx].remarks = e.target.value;
                              setPayrollPaymentStatus(updated);
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

            {/* 6. EXPENSE TRACKING */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">6</span>
                Expense Tracking
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/3">Expense Category</th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/4">Amount</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {expenseTracking.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.category}</td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.amount || ''}
                            onChange={(e) => {
                              const updated = [...expenseTracking];
                              updated[idx].amount = e.target.value;
                              setExpenseTracking(updated);
                            }}
                            className="w-full text-right bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none font-mono"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => {
                              const updated = [...expenseTracking];
                              updated[idx].remarks = e.target.value;
                              setExpenseTracking(updated);
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

            {/* 7. DOCUMENTATION & COMPLIANCE */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">7</span>
                Documentation & Compliance
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-2/3">Activity</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {documentationCompliance.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.activity}</td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.status || ''}
                            onChange={(e) => {
                              const updated = [...documentationCompliance];
                              updated[idx].status = e.target.value;
                              setDocumentationCompliance(updated);
                            }}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 8. KPI TRACKING */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">8</span>
                KPI Tracking
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-2/3">KPI</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Achieved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {kpiTracking.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.kpi}</td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.targetAchieved || ''}
                            onChange={(e) => {
                              const updated = [...kpiTracking];
                              updated[idx].targetAchieved = e.target.value;
                              setKpiTracking(updated);
                            }}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 9. ISSUES / SUPPORT REQUIRED */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">9</span>
                  Issues / Support Required
                </h2>
                <button
                  type="button"
                  onClick={addIssueRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-lime-400 dark:hover:text-lime-500 uppercase tracking-wider"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/3">Issue</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-40">Priority</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Action Taken / Required</th>
                      <th className="px-3 py-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {issuesSupportRequired.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-slate-400 dark:text-slate-600 italic">
                          No issues logged. Click "Add Row" to report issues.
                        </td>
                      </tr>
                    ) : (
                      issuesSupportRequired.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.issue || ''}
                              onChange={(e) => handleIssueChange(idx, 'issue', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.priority || ''}
                              onChange={(e) => handleIssueChange(idx, 'priority', e.target.value)}
                              className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                              placeholder="e.g. High / Med / Low"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.action || ''}
                              onChange={(e) => handleIssueChange(idx, 'action', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeIssueRow(idx)}
                              className="text-rose-500 hover:text-rose-600 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 10. NEXT DAY TASK PLAN */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">10</span>
                Next Day Task Plan
              </h2>
              <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                {nextDayTaskPlan.map((plan, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="font-bold text-slate-400 dark:text-slate-600 w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={plan || ''}
                      onChange={(e) => {
                        const updated = [...nextDayTaskPlan];
                        updated[idx] = e.target.value;
                        setNextDayTaskPlan(updated);
                      }}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder={`Task ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 11. FINAL SHIFT HANDOVER */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">11</span>
                Final Shift Handover
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-2/3">Handover Item</th>
                      <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {finalShiftHandover.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{item.item}</td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.status || ''}
                            onChange={(e) => {
                              const updated = [...finalShiftHandover];
                              updated[idx].status = e.target.value;
                              setFinalShiftHandover(updated);
                            }}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-sm focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 12. ACCOUNTANT COMMENTS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">12</span>
                Accountant Comments
              </h2>
              <textarea
                value={accountantComments}
                onChange={(e) => setAccountantComments(e.target.value)}
                className="w-full h-28 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Enter comments, handover notes or highlights..."
              />
            </div>

            {/* 13. APPROVAL SIGN-OFFS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">13</span>
                Approval Sign-Offs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    Accountant Verification
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.accountantName || ''}
                      onChange={(e) => setApproval({ ...approval, accountantName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Signature Initials</label>
                    <input
                      type="text"
                      value={approval.accountantSignature || ''}
                      onChange={(e) => setApproval({ ...approval, accountantSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.accountantDate || ''}
                      onChange={(e) => setApproval({ ...approval, accountantDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                    Manager Review Approval
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name / Title</label>
                    <input
                      type="text"
                      value={approval.managerName || ''}
                      onChange={(e) => setApproval({ ...approval, managerName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Signature Initials</label>
                    <input
                      type="text"
                      value={approval.managerSignature || ''}
                      onChange={(e) => setApproval({ ...approval, managerSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                      disabled={!isPrivileged}
                      placeholder={!isPrivileged ? "Restricted to Managers" : "Signature"}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Approved</label>
                    <input
                      type="text"
                      value={approval.managerDate || ''}
                      onChange={(e) => setApproval({ ...approval, managerDate: e.target.value })}
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

export default AccountantReportPage;
