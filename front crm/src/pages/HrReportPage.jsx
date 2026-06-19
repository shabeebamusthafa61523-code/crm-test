import React, { useState, useEffect, useCallback } from 'react';
import { uploadCompiledPDFReport } from '../services/departmentService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Calendar, Plus, Trash2, Save, Download, 
  CheckCircle, HelpCircle, Loader2, User, ChevronRight, Pencil
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_URL;

// Default items for HR Shift Report
const DEFAULT_DAILY_OPERATIONS = [
  { activity: 'Staff Attendance Verified', status: 'Done', remarks: '' },
  { activity: 'Admin Tasks Monitored', status: 'Done', remarks: '' },
  { activity: 'Recruitment Follow-up', status: 'Done', remarks: '' },
  { activity: 'Employee Support', status: 'Done', remarks: '' },
  { activity: 'Reports Collected', status: 'Done', remarks: '' }
];

const DEFAULT_EMPLOYEE_MGMT = [
  { employeeName: 'NA', department: '', attendance: 'Present / Absent', taskStatus: 'Completed / Pending', remarks: '' },
  { employeeName: 'NA', department: '', attendance: 'Present / Absent', taskStatus: 'Completed / Pending', remarks: '' }
];

const DEFAULT_RECRUITMENT = [
  { activity: 'Applications Received:', countStatus: '0' },
  { activity: 'Interviews Conducted:', countStatus: '0' },
  { activity: 'Candidates Shortlisted:', countStatus: '0' },
  { activity: 'New Joining', countStatus: '0' },
  { activity: 'Pending Hiring', countStatus: 'None' }
];

const DEFAULT_ATTENDANCE_LEAVE = [
  { category: 'Present Employees', count: '07' },
  { category: 'Absent Employees', count: '05' },
  { category: 'Leave Requests', count: '02' },
  { category: 'Approved Leaves', count: '02' },
  { category: 'Late Attendance Cases', count: '0' }
];

const DEFAULT_ADMIN_OPERATIONS = [
  { activity: 'Office Maintenance', status: 'Completed / Pending', remarks: 'NA' },
  { activity: 'Inventory Check', status: 'Completed / Pending', remarks: 'NA' },
  { activity: 'Asset Management', status: 'Completed', remarks: '' },
  { activity: 'Vendor Coordination', status: 'Completed / Pending', remarks: 'NA' },
  { activity: 'Utility Monitoring', status: 'Completed / Pending', remarks: 'NA' }
];

const DEFAULT_DOCUMENTATION = [
  { activity: 'Employee Documents Updated', status: 'Yes' },
  { activity: 'Contracts Verified', status: 'None' },
  { activity: 'Payroll Coordination Done', status: 'yes' },
  { activity: 'Compliance Checked', status: 'Yes' },
  { activity: 'Reports Filed', status: 'yes' }
];

const DEFAULT_KPI_TRACKING = [
  { kpi: 'Attendance Compliance', status: 'Yes' },
  { kpi: 'Recruitment Tasks', status: 'Yes' },
  { kpi: 'Admin Tasks Completed', status: 'NA' },
  { kpi: 'Employee Support Requests Closed', status: 'Nil' }
];

const DEFAULT_ISSUES = [
  { issue: 'NA', priority: 'High / Medium / Low', actionTaken: '__________' },
  { issue: 'NA', priority: 'High / Medium / Low', actionTaken: '__________' }
];

const DEFAULT_HANDOVER = [
  { item: 'Pending Tasks Shared', status: 'No' },
  { item: 'Reports Submitted', status: 'Yes' },
  { item: 'Documents Updated', status: 'Yes' },
  { item: 'Management Updated', status: 'Yes' }
];

const HrReportPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isPrivileged, setIsPrivileged] = useState(false);

  // Selection states
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
  const [hrStaff, setHrStaff] = useState([]);
  const [submittedDates, setSubmittedDates] = useState([]);

  // Form States
  const [basicDetails, setBasicDetails] = useState({
    date: '',
    day: '',
    employeeName: '',
    employeeId: '',
    department: 'HR / Admin',
    designation: 'HR / Admin Manager',
    shiftTiming: '9:00 AM – 5:00 PM',
    reportingTo: 'COO / Executive Director',
    preparedTime: ''
  });

  const [dailyOperations, setDailyOperations] = useState(DEFAULT_DAILY_OPERATIONS);
  const [employeeManagement, setEmployeeManagement] = useState(DEFAULT_EMPLOYEE_MGMT);
  const [recruitmentReport, setRecruitmentReport] = useState(DEFAULT_RECRUITMENT);
  const [attendanceLeave, setAttendanceLeave] = useState(DEFAULT_ATTENDANCE_LEAVE);
  const [adminOperations, setAdminOperations] = useState(DEFAULT_ADMIN_OPERATIONS);
  const [documentationCompliance, setDocumentationCompliance] = useState(DEFAULT_DOCUMENTATION);
  const [kpiTracking, setKpiTracking] = useState(DEFAULT_KPI_TRACKING);
  const [issuesEscalations, setIssuesEscalations] = useState(DEFAULT_ISSUES);
  const [nextDayActionPlan, setNextDayActionPlan] = useState("1.\n\n2.\n\n3.");
  const [finalShiftHandover, setFinalShiftHandover] = useState(DEFAULT_HANDOVER);
  const [hrAdminComments, setHrAdminComments] = useState('');
  
  const [approval, setApproval] = useState({
    hrName: '',
    hrSignature: '',
    hrDate: '',
    cooName: 'COO / Executive Director',
    cooSignature: '',
    cooDate: ''
  });

  // Monthly states
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);

  // Auto-open monthly modal from URL parameters
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
      }
    }
  }, [selectedUserId]);
  const [monthlyStartDate, setMonthlyStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [monthlyEndDate, setMonthlyEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [monthlyActiveTab, setMonthlyActiveTab] = useState("recruitment");
  const [monthlyBasicDetails, setMonthlyBasicDetails] = useState({
    dateRange: '',
    employeeName: '',
    employeeId: '',
    department: '',
    designation: '',
    reportingTo: '',
    preparedTime: ''
  });
  const [monthlyDailyOperations, setMonthlyDailyOperations] = useState([]);
  const [monthlyEmployeeManagement, setMonthlyEmployeeManagement] = useState([]);
  const [monthlyRecruitmentReport, setMonthlyRecruitmentReport] = useState([]);
  const [monthlyAttendanceLeave, setMonthlyAttendanceLeave] = useState([]);
  const [monthlyAdminOperations, setMonthlyAdminOperations] = useState([]);
  const [monthlyDocumentationCompliance, setMonthlyDocumentationCompliance] = useState([]);
  const [monthlyKpiTracking, setMonthlyKpiTracking] = useState([]);
  const [monthlyIssuesEscalations, setMonthlyIssuesEscalations] = useState([]);
  const [monthlyFinalShiftHandover, setMonthlyFinalShiftHandover] = useState([]);
  const [monthlyNextDayActionPlan, setMonthlyNextDayActionPlan] = useState('');
  const [monthlyHrAdminComments, setMonthlyHrAdminComments] = useState('');

  // Get Auth Headers Helper
  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const handleFetchMonthlyData = async () => {
    if (!selectedUserId) {
      showToast("Please select a user first.", "error");
      return;
    }
    setIsMonthlyLoading(true);
    try {
      const start = new Date(monthlyStartDate);
      const end = new Date(monthlyEndDate);
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      const promises = dates.map(dateStr => 
        fetch(`${API_BASE}/v1/hr-reports/by-date?userId=${selectedUserId}&dateString=${dateStr}`, {
          headers: getAuthHeaders()
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const validReports = results
        .filter(res => res.success && res.data)
        .map(res => res.data);

      if (validReports.length === 0) {
        showToast("No daily reports found in the selected date range.", "warning");
        setIsMonthlyLoading(false);
        return;
      }

      const consolidatedRecruitment = JSON.parse(JSON.stringify(DEFAULT_RECRUITMENT));
      const consolidatedAttendance = JSON.parse(JSON.stringify(DEFAULT_ATTENDANCE_LEAVE));
      const consolidatedDailyOps = JSON.parse(JSON.stringify(DEFAULT_DAILY_OPERATIONS));
      const consolidatedAdminOps = JSON.parse(JSON.stringify(DEFAULT_ADMIN_OPERATIONS));
      const consolidatedCompliance = JSON.parse(JSON.stringify(DEFAULT_DOCUMENTATION));
      const consolidatedKPI = JSON.parse(JSON.stringify(DEFAULT_KPI_TRACKING));
      const consolidatedHandover = JSON.parse(JSON.stringify(DEFAULT_HANDOVER));

      consolidatedDailyOps.forEach(row => { row.remarks = ''; row.status = ''; });
      consolidatedAdminOps.forEach(row => { row.remarks = ''; row.status = ''; });
      consolidatedCompliance.forEach(row => { row.status = ''; });
      consolidatedKPI.forEach(row => { row.status = ''; });
      consolidatedHandover.forEach(row => { row.status = ''; });

      let combinedEmployeeMgmt = [];
      let combinedIssues = [];
      let combinedActionPlans = [];
      let combinedComments = [];

      const recruitMap = {};
      consolidatedRecruitment.forEach(item => {
        recruitMap[item.activity] = {
          isNumeric: !['Pending Hiring'].includes(item.activity),
          sum: 0,
          textList: []
        };
      });

      const attendanceMap = {};
      consolidatedAttendance.forEach(item => {
        attendanceMap[item.category] = {
          sum: 0
        };
      });

      const dailyOpsMap = {};
      consolidatedDailyOps.forEach(item => {
        dailyOpsMap[item.activity] = {
          statuses: [],
          remarks: []
        };
      });

      const adminOpsMap = {};
      consolidatedAdminOps.forEach(item => {
        adminOpsMap[item.activity] = {
          statuses: [],
          remarks: []
        };
      });

      const complianceMap = {};
      consolidatedCompliance.forEach(item => {
        complianceMap[item.activity] = {
          statuses: []
        };
      });

      const kpiMap = {};
      consolidatedKPI.forEach(item => {
        kpiMap[item.kpi] = {
          statuses: []
        };
      });

      const handoverMap = {};
      consolidatedHandover.forEach(item => {
        handoverMap[item.item] = {
          statuses: []
        };
      });

      validReports.forEach(report => {
        if (Array.isArray(report.recruitmentReport)) {
          report.recruitmentReport.forEach(item => {
            const act = item.activity;
            if (recruitMap[act]) {
              if (recruitMap[act].isNumeric) {
                const val = parseFloat(String(item.countStatus || '0').replace(/[^0-9.-]/g, ''));
                if (!isNaN(val)) {
                  recruitMap[act].sum += val;
                }
              } else {
                if (item.countStatus && item.countStatus !== 'None' && item.countStatus !== 'NA') {
                  recruitMap[act].textList.push(item.countStatus);
                }
              }
            }
          });
        }

        if (Array.isArray(report.attendanceLeave)) {
          report.attendanceLeave.forEach(item => {
            const cat = item.category;
            if (attendanceMap[cat]) {
              const val = parseFloat(String(item.count || '0').replace(/[^0-9.-]/g, ''));
              if (!isNaN(val)) {
                attendanceMap[cat].sum += val;
              }
            }
          });
        }

        if (Array.isArray(report.dailyOperations)) {
          report.dailyOperations.forEach(item => {
            const act = item.activity;
            if (dailyOpsMap[act]) {
              if (item.status && item.status !== 'Done') {
                dailyOpsMap[act].statuses.push(item.status);
              }
              if (item.remarks && item.remarks !== 'NA' && item.remarks !== '') {
                dailyOpsMap[act].remarks.push(item.remarks);
              }
            }
          });
        }

        if (Array.isArray(report.adminOperations)) {
          report.adminOperations.forEach(item => {
            const act = item.activity;
            if (adminOpsMap[act]) {
              if (item.status) {
                adminOpsMap[act].statuses.push(item.status);
              }
              if (item.remarks && item.remarks !== 'NA' && item.remarks !== '') {
                adminOpsMap[act].remarks.push(item.remarks);
              }
            }
          });
        }

        if (Array.isArray(report.documentationCompliance)) {
          report.documentationCompliance.forEach(item => {
            const act = item.activity;
            if (complianceMap[act]) {
              if (item.status) complianceMap[act].statuses.push(item.status);
            }
          });
        }

        if (Array.isArray(report.kpiTracking)) {
          report.kpiTracking.forEach(item => {
            const kpi = item.kpi;
            if (kpiMap[kpi]) {
              if (item.status) kpiMap[kpi].statuses.push(item.status);
            }
          });
        }

        if (Array.isArray(report.finalShiftHandover)) {
          report.finalShiftHandover.forEach(item => {
            const hit = item.item;
            if (handoverMap[hit]) {
              if (item.status) handoverMap[hit].statuses.push(item.status);
            }
          });
        }

        if (Array.isArray(report.employeeManagement)) {
          report.employeeManagement.forEach(emp => {
            if (emp.employeeName && emp.employeeName !== 'NA' && emp.employeeName !== '') {
              combinedEmployeeMgmt.push({ ...emp });
            }
          });
        }

        if (Array.isArray(report.issuesEscalations)) {
          report.issuesEscalations.forEach(iss => {
            if (iss.issue && iss.issue !== 'NA' && iss.issue !== '') {
              combinedIssues.push({ ...iss });
            }
          });
        }

        if (report.nextDayActionPlan && report.nextDayActionPlan !== "1.\n\n2.\n\n3.") {
          combinedActionPlans.push(report.nextDayActionPlan);
        }

        if (report.hrAdminComments) {
          combinedComments.push(report.hrAdminComments);
        }
      });

      const finalRecruitment = consolidatedRecruitment.map(item => {
        const entry = recruitMap[item.activity];
        let val = '';
        if (entry.isNumeric) {
          val = String(entry.sum);
        } else {
          val = entry.textList.length > 0 ? Array.from(new Set(entry.textList)).join('; ') : 'None';
        }
        return {
          activity: item.activity,
          countStatus: val
        };
      });

      const finalAttendance = consolidatedAttendance.map(item => {
        const entry = attendanceMap[item.category];
        return {
          category: item.category,
          count: String(entry.sum)
        };
      });

      const finalDailyOps = consolidatedDailyOps.map(item => {
        const entry = dailyOpsMap[item.activity];
        const statuses = Array.from(new Set(entry.statuses));
        const remarks = Array.from(new Set(entry.remarks));
        return {
          activity: item.activity,
          status: statuses.length > 0 ? statuses.join('; ') : 'Done',
          remarks: remarks.length > 0 ? remarks.join('; ') : 'NA'
        };
      });

      const finalAdminOps = consolidatedAdminOps.map(item => {
        const entry = adminOpsMap[item.activity];
        const statuses = Array.from(new Set(entry.statuses));
        const remarks = Array.from(new Set(entry.remarks));
        return {
          activity: item.activity,
          status: statuses.length > 0 ? statuses.join('; ') : 'Completed',
          remarks: remarks.length > 0 ? remarks.join('; ') : 'NA'
        };
      });

      const finalCompliance = consolidatedCompliance.map(item => {
        const entry = complianceMap[item.activity];
        const statuses = Array.from(new Set(entry.statuses));
        return {
          activity: item.activity,
          status: statuses.length > 0 ? statuses.join('; ') : 'Yes'
        };
      });

      const finalKPI = consolidatedKPI.map(item => {
        const entry = kpiMap[item.kpi];
        const statuses = Array.from(new Set(entry.statuses));
        return {
          kpi: item.kpi,
          status: statuses.length > 0 ? statuses.join('; ') : 'Yes'
        };
      });

      const finalHandover = consolidatedHandover.map(item => {
        const entry = handoverMap[item.item];
        const statuses = Array.from(new Set(entry.statuses));
        return {
          item: item.item,
          status: statuses.length > 0 ? statuses.join('; ') : 'Yes'
        };
      });

      if (combinedEmployeeMgmt.length === 0) {
        combinedEmployeeMgmt = [
          { employeeName: 'NA', department: '', attendance: 'Present / Absent', taskStatus: 'Completed / Pending', remarks: '' }
        ];
      }
      if (combinedIssues.length === 0) {
        combinedIssues = [
          { issue: 'NA', priority: 'High / Medium / Low', actionTaken: '__________' }
        ];
      }

      const userDetail = isPrivileged && hrStaff.length > 0 
        ? (hrStaff.find(u => u._id === selectedUserId) || currentUser) 
        : currentUser;

      const formattedStart = new Date(monthlyStartDate).toLocaleDateString('en-GB').replace(/\//g, '-');
      const formattedEnd = new Date(monthlyEndDate).toLocaleDateString('en-GB').replace(/\//g, '-');

      setMonthlyBasicDetails({
        dateRange: `${formattedStart} to ${formattedEnd}`,
        employeeName: userDetail.name || '',
        employeeId: userDetail.employeeId || '',
        department: 'HR / Admin',
        designation: userDetail.designation || 'HR / Admin Manager',
        reportingTo: userDetail.reportingManager || 'COO / Executive Director',
        preparedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });

      setMonthlyRecruitmentReport(finalRecruitment);
      setMonthlyAttendanceLeave(finalAttendance);
      setMonthlyDailyOperations(finalDailyOps);
      setMonthlyAdminOperations(finalAdminOps);
      setMonthlyEmployeeManagement(combinedEmployeeMgmt);
      setMonthlyDocumentationCompliance(finalCompliance);
      setMonthlyKpiTracking(finalKPI);
      setMonthlyIssuesEscalations(combinedIssues);
      setMonthlyFinalShiftHandover(finalHandover);
      setMonthlyNextDayActionPlan(combinedActionPlans.length > 0 ? combinedActionPlans.join('\n\n') : '1.\n\n2.\n\n3.');
      setMonthlyHrAdminComments(combinedComments.length > 0 ? combinedComments.join('\n\n') : '');

      showToast(`Consolidated ${validReports.length} daily report(s) successfully!`, "success");
    } catch (error) {
      console.error("Error consolidating data:", error);
      showToast("Error consolidating data. Please try again.", "error");
    } finally {
      setIsMonthlyLoading(false);
    }
  };

  const handleDownloadMonthlyPDF = async () => {
    try {
      const logoImg = new Image();
      logoImg.src = '/logo3.png';
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
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
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          doc.addImage(logoImg, 'PNG', 14, 10, 32, 12);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(22);
          doc.setTextColor(132, 204, 22);
          doc.text("KOD.", 14, 21);
          
          doc.setTextColor(60, 35, 117);
          doc.text("brand", 34, 21);
        }

        doc.setFontSize(14);
        doc.setTextColor(60, 35, 117);
        doc.text("MONTHLY CONSOLIDATED HR REPORT", 110, 16);
        
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text("HR / ADMIN MANAGER", 155, 22);
      };

      // ================= PAGE 1 =================
      drawHeader();
      currentY = 27;

      drawSectionHeader("1. BASIC DETAILS");
      const basicDetailsRows = [
        ["Date Range", monthlyBasicDetails.dateRange || ''],
        ["Employee Name:", monthlyBasicDetails.employeeName || ''],
        ["Employee ID", monthlyBasicDetails.employeeId || ''],
        ["Department", monthlyBasicDetails.department || ''],
        ["Designation", monthlyBasicDetails.designation || ''],
        ["Reporting To", monthlyBasicDetails.reportingTo || ''],
        ["Prepared Time", monthlyBasicDetails.preparedTime || '']
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

      drawSectionHeader("2. DAILY OPERATIONS SUMMARY (CONSOLIDATED)");
      const opsHeaders = [["Activity", "Status", "Remarks"]];
      const opsRows = monthlyDailyOperations.map(o => [o.activity || '', o.status || '', o.remarks || '']);

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

      drawSectionHeader("3. EMPLOYEE MANAGEMENT REPORT (CONSOLIDATED)");
      const empHeaders = [["Employee Name", "Department", "Attendance", "Task Status", "Remarks"]];
      const empRows = monthlyEmployeeManagement.map(e => [e.employeeName || '', e.department || '', e.attendance || '', e.taskStatus || '', e.remarks || '']);

      autoTable(doc, {
        head: empHeaders,
        body: empRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 40 },
          1: { width: 35 },
          2: { width: 35, halign: 'center' },
          3: { width: 35, halign: 'center' },
          4: { width: 37 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("4. RECRUITMENT REPORT (CONSOLIDATED)");
      const recruitHeaders = [["Recruitment Activity", "Count / Status"]];
      const recruitRows = monthlyRecruitmentReport.map(r => [r.activity || '', r.countStatus || '']);

      autoTable(doc, {
        head: recruitHeaders,
        body: recruitRows,
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

      // ================= PAGE 2 =================
      doc.addPage();
      currentY = 15;
      drawHeader();
      currentY = 27;

      drawSectionHeader("5. ATTENDANCE & LEAVE REPORT (CONSOLIDATED)");
      const leaveHeaders = [["Category", "Count"]];
      const leaveRows = monthlyAttendanceLeave.map(l => [l.category || '', l.count || '']);

      autoTable(doc, {
        head: leaveHeaders,
        body: leaveRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 110 },
          1: { width: 72, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("6. ADMIN OPERATIONS REPORT (CONSOLIDATED)");
      const adminOpsHeaders = [["Activity", "Status", "Remarks"]];
      const adminOpsRows = monthlyAdminOperations.map(a => [a.activity || '', a.status || '', a.remarks || '']);

      autoTable(doc, {
        head: adminOpsHeaders,
        body: adminOpsRows,
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

      drawSectionHeader("7. DOCUMENTATION & COMPLIANCE (CONSOLIDATED)");
      const complianceHeaders = [["Activity", "Status"]];
      const complianceRows = monthlyDocumentationCompliance.map(d => [d.activity || '', d.status || '']);

      autoTable(doc, {
        head: complianceHeaders,
        body: complianceRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 110 },
          1: { width: 72, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("8. KPI TRACKING (CONSOLIDATED)");
      const kpiHeaders = [["KPI", "Status"]];
      const kpiRows = monthlyKpiTracking.map(k => [k.kpi || '', k.status || '']);

      autoTable(doc, {
        head: kpiHeaders,
        body: kpiRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 110 },
          1: { width: 72, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("9. ISSUES / ESCALATIONS (CONSOLIDATED)");
      const issueHeaders = [["Issue", "Priority", "Action Taken"]];
      const issueRows = monthlyIssuesEscalations.map(i => [i.issue || '', i.priority || '', i.actionTaken || '']);

      autoTable(doc, {
        head: issueHeaders,
        body: issueRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 60 },
          1: { width: 45, halign: 'center' },
          2: { width: 77 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("10. NEXT DAY ACTION PLAN (CONSOLIDATED)");
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const planLines = doc.splitTextToSize(monthlyNextDayActionPlan || '', 178);
      doc.text(planLines, 16, currentY + 5);
      const planBoxHeight = Math.max(16, planLines.length * 4.2 + 6);
      doc.setDrawColor(180, 180, 180);
      doc.rect(14, currentY, 182, planBoxHeight);

      // ================= PAGE 3 =================
      doc.addPage();
      currentY = 15;
      drawHeader();
      currentY = 27;

      drawSectionHeader("11. FINAL SHIFT HANDOVER (CONSOLIDATED)");
      const handoverHeaders = [["Handover Item", "Status"]];
      const handoverRows = monthlyFinalShiftHandover.map(h => [h.item || '', h.status || '']);

      autoTable(doc, {
        head: handoverHeaders,
        body: handoverRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [60, 35, 117], fontStyle: 'bold', lineColor: [180, 180, 180], lineWidth: 0.15 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.15 },
        columnStyles: {
          0: { width: 110 },
          1: { width: 72, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 4;

      drawSectionHeader("12. HR / ADMIN COMMENTS (CONSOLIDATED)");
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const commentsLines = doc.splitTextToSize(monthlyHrAdminComments || '', 178);
      doc.text(commentsLines, 16, currentY + 5);
      const commentsBoxHeight = Math.max(16, commentsLines.length * 4.2 + 6);
      doc.setDrawColor(180, 180, 180);
      doc.rect(14, currentY, 182, commentsBoxHeight);
      const pdfBlob = doc.output('blob');
      const filename = `HR_Monthly_Consolidated_Report_${monthlyBasicDetails.employeeName || 'HR'}_${monthlyStartDate}_to_${monthlyEndDate}.pdf`;
      try {
        await uploadCompiledPDFReport(selectedUserId, `${monthlyStartDate}_to_${monthlyEndDate}`, pdfBlob, filename, 'hr', 'monthly');
        console.log("Monthly PDF saved successfully");
      } catch (uploadErr) {
        console.error("Failed to upload monthly PDF:", uploadErr);
      }
      doc.save(filename);
      showToast("Monthly PDF report downloaded successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to generate Monthly PDF.", "error");
    }
  };

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

  // Fetch HR Staff List (For Admins)
  useEffect(() => {
    if (isPrivileged) {
      const fetchHrStaff = async () => {
        try {
          const res = await fetch(`${API_BASE}/v1/hr-reports/hr-staff`, {
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setHrStaff(data.data);
            if (data.data.length > 0 && !selectedUserId) {
              setSelectedUserId(data.data[0]._id);
            }
          }
        } catch (e) {
          console.error("Failed to fetch HR Staff list:", e);
        }
      };
      fetchHrStaff();
    }
  }, [isPrivileged, getAuthHeaders, selectedUserId]);

  // Fetch submitted dates
  const fetchSubmittedDates = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/v1/hr-reports/submitted-dates?userId=${userId}`, {
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

  // Fetch HR report data
  const fetchReport = useCallback(async (userId, dateStr) => {
    if (!userId || !dateStr) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/v1/hr-reports/by-date?userId=${userId}&dateString=${dateStr}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.success && data.data) {
        const report = data.data;
        setBasicDetails(report.basicDetails || {});
        setDailyOperations(report.dailyOperations || []);
        setEmployeeManagement(report.employeeManagement || []);
        setRecruitmentReport(report.recruitmentReport || []);
        setAttendanceLeave(report.attendanceLeave || []);
        setAdminOperations(report.adminOperations || []);
        setDocumentationCompliance(report.documentationCompliance || []);
        setKpiTracking(report.kpiTracking || []);
        setIssuesEscalations(report.issuesEscalations || []);
        setNextDayActionPlan(report.nextDayActionPlan || "1.\n\n2.\n\n3.");
        setFinalShiftHandover(report.finalShiftHandover || []);
        setHrAdminComments(report.hrAdminComments || '');
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

  // Cache basicDetails in localStorage when they change
  useEffect(() => {
    if (selectedUserId && basicDetails && (basicDetails.employeeName || basicDetails.employeeId)) {
      const { date, day, ...persistent } = basicDetails;
      if (Object.keys(persistent).length > 0) {
        localStorage.setItem(`cachedBasicDetails_Hr_${selectedUserId}`, JSON.stringify(persistent));
      }
    }
  }, [basicDetails, selectedUserId]);

  const initializeBlankReport = (userId, dateStr) => {
    let userDetail = currentUser;
    if (isPrivileged && hrStaff.length > 0) {
      userDetail = hrStaff.find(u => u._id === userId) || currentUser;
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

    // Load from cache if exists
    const cached = localStorage.getItem(`cachedBasicDetails_Hr_${userId}`);
    const parsedCached = cached ? JSON.parse(cached) : null;

    setBasicDetails({
      date: formattedDateString,
      day: dayName,
      employeeName: parsedCached?.employeeName || userDetail.name || '',
      employeeId: parsedCached?.employeeId || userDetail.employeeId || '',
      department: parsedCached?.department || 'HR / Admin',
      designation: parsedCached?.designation || userDetail.designation || 'HR / Admin Manager',
      shiftTiming: parsedCached?.shiftTiming || '9:00 AM – 5:00 PM',
      reportingTo: parsedCached?.reportingTo || userDetail.reportingManager || 'COO / Executive Director',
      preparedTime: parsedCached?.preparedTime || timeStr
    });

    setDailyOperations(DEFAULT_DAILY_OPERATIONS);
    setEmployeeManagement(DEFAULT_EMPLOYEE_MGMT);
    setRecruitmentReport(DEFAULT_RECRUITMENT);
    setAttendanceLeave(DEFAULT_ATTENDANCE_LEAVE);
    setAdminOperations(DEFAULT_ADMIN_OPERATIONS);
    setDocumentationCompliance(DEFAULT_DOCUMENTATION);
    setKpiTracking(DEFAULT_KPI_TRACKING);
    setIssuesEscalations(DEFAULT_ISSUES);
    setNextDayActionPlan("1.\n\n2.\n\n3.");
    setFinalShiftHandover(DEFAULT_HANDOVER);
    setHrAdminComments('');
    setApproval({
      hrName: userDetail.name || '',
      hrSignature: '',
      hrDate: formattedDateString,
      cooName: 'COO / Executive Director',
      cooSignature: '',
      cooDate: ''
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
        employeeManagement,
        recruitmentReport,
        attendanceLeave,
        adminOperations,
        documentationCompliance,
        kpiTracking,
        issuesEscalations,
        nextDayActionPlan,
        finalShiftHandover,
        hrAdminComments,
        approval
      };

      const res = await fetch(`${API_BASE}/v1/hr-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("HR Daily Shift Report saved successfully!", 'success');
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

  const handleDownloadPDF = async () => {
    const reportType = 'hr';
    // Automatically save report as well
    await handleSaveReport();

    try {
      showToast("Generating PDF on server...", "info");
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/"/g, '') : '';
      
      const url = `${API_BASE}/v1/employee-reports/generate-pdf?userId=${selectedUserId}&dateString=${selectedDate}&reportType=${reportType}`;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`
        }
      });
      
      if (!res.ok) {
        throw new Error("Failed to generate PDF report on server.");
      }
      
      const blob = await res.blob();
      const filename = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_Report_${(basicDetails.employeeName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_')}_${selectedDate}.pdf`;
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }, 15000);
      
      showToast("PDF report downloaded and saved successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to download PDF.", "error");
    }
  };;

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
              Select HR Staff
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {hrStaff.map(hr => (
                  <option key={hr._id} value={hr._id}>
                    {hr.name} ({hr.employeeId || 'No ID'})
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
                  HR Daily Shift Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill, review, and download HR operations reports.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMonthlyModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm transition-all"
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Employee ID</label>
                  <input
                    type="text"
                    value={basicDetails.employeeId || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, employeeId: e.target.value })}
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
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Reporting To</label>
                  <input
                    type="text"
                    value={basicDetails.reportingTo || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, reportingTo: e.target.value })}
                    readOnly={!isEditingBasic}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isEditingBasic ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Prepared Time</label>
                  <input
                    type="text"
                    value={basicDetails.preparedTime || ''}
                    onChange={(e) => setBasicDetails({ ...basicDetails, preparedTime: e.target.value })}
                    readOnly={!isEditingBasic}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${isEditingBasic ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
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

            {/* 3. EMPLOYEE MANAGEMENT REPORT */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">3</span>
                Employee Management Report
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Employee Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3 w-44">Attendance</th>
                      <th className="px-4 py-3 w-48">Task Status</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {employeeManagement.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.employeeName}
                            onChange={(e) => {
                              const newArr = [...employeeManagement];
                              newArr[i].employeeName = e.target.value;
                              setEmployeeManagement(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm font-semibold"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.department}
                            onChange={(e) => {
                              const newArr = [...employeeManagement];
                              newArr[i].department = e.target.value;
                              setEmployeeManagement(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                            placeholder="e.g. Sales"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.attendance}
                            onChange={(e) => {
                              const newArr = [...employeeManagement];
                              newArr[i].attendance = e.target.value;
                              setEmployeeManagement(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.taskStatus}
                            onChange={(e) => {
                              const newArr = [...employeeManagement];
                              newArr[i].taskStatus = e.target.value;
                              setEmployeeManagement(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => {
                              const newArr = [...employeeManagement];
                              newArr[i].remarks = e.target.value;
                              setEmployeeManagement(newArr);
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

            {/* 4. RECRUITMENT REPORT */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">4</span>
                Recruitment Report
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Recruitment Activity</th>
                      <th className="px-4 py-3 w-48">Count / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {recruitmentReport.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.activity}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.countStatus}
                            onChange={(e) => {
                              const newArr = [...recruitmentReport];
                              newArr[i].countStatus = e.target.value;
                              setRecruitmentReport(newArr);
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

            {/* 5. ATTENDANCE & LEAVE REPORT */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">5</span>
                Attendance & Leave Report
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 w-48">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {attendanceLeave.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.category}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.count}
                            onChange={(e) => {
                              const newArr = [...attendanceLeave];
                              newArr[i].count = e.target.value;
                              setAttendanceLeave(newArr);
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

            {/* 6. ADMIN OPERATIONS REPORT */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">6</span>
                Admin Operations Report
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3 w-48 font-semibold">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {adminOperations.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.activity}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...adminOperations];
                              newArr[i].status = e.target.value;
                              setAdminOperations(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => {
                              const newArr = [...adminOperations];
                              newArr[i].remarks = e.target.value;
                              setAdminOperations(newArr);
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

            {/* 7. DOCUMENTATION & COMPLIANCE */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">7</span>
                Documentation & Compliance
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3 w-48">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {documentationCompliance.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.activity}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...documentationCompliance];
                              newArr[i].status = e.target.value;
                              setDocumentationCompliance(newArr);
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

            {/* 8. KPI TRACKING */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">8</span>
                KPI Tracking
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">KPI</th>
                      <th className="px-4 py-3 w-48">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {kpiTracking.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.kpi}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...kpiTracking];
                              newArr[i].status = e.target.value;
                              setKpiTracking(newArr);
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

            {/* 9. ISSUES / ESCALATIONS */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">9</span>
                Issues / Escalations
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Issue</th>
                      <th className="px-4 py-3 w-48">Priority</th>
                      <th className="px-4 py-3">Action Taken</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {issuesEscalations.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.issue}
                            onChange={(e) => {
                              const newArr = [...issuesEscalations];
                              newArr[i].issue = e.target.value;
                              setIssuesEscalations(newArr);
                            }}
                            className="w-full bg-transparent border-none focus:outline-none p-0 text-sm font-semibold"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={row.priority}
                            onChange={(e) => {
                              const newArr = [...issuesEscalations];
                              newArr[i].priority = e.target.value;
                              setIssuesEscalations(newArr);
                            }}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none"
                          >
                            <option value="High / Medium / Low">High / Medium / Low</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.actionTaken}
                            onChange={(e) => {
                              const newArr = [...issuesEscalations];
                              newArr[i].actionTaken = e.target.value;
                              setIssuesEscalations(newArr);
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

            {/* 10. NEXT DAY ACTION PLAN */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">10</span>
                Next Day Action Plan
              </h2>
              <textarea
                value={nextDayActionPlan}
                onChange={(e) => setNextDayActionPlan(e.target.value)}
                placeholder="1. Tasks planned..."
                className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
              />
            </div>

            {/* 11. FINAL SHIFT HANDOVER */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">11</span>
                Final Shift Handover
              </h2>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Handover Item</th>
                      <th className="px-4 py-3 w-48">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {finalShiftHandover.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-semibold text-xs text-slate-500">{row.item}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) => {
                              const newArr = [...finalShiftHandover];
                              newArr[i].status = e.target.value;
                              setFinalShiftHandover(newArr);
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

            {/* 12. HR / ADMIN COMMENTS */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">12</span>
                HR / Admin Comments
              </h2>
              <textarea
                value={hrAdminComments}
                onChange={(e) => setHrAdminComments(e.target.value)}
                placeholder="Enter remarks or summary comments"
                className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
              />
            </div>

            {/* 13. APPROVAL */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-lime-950/50 text-[10px]">13</span>
                Approval Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">HR / Admin Manager</h4>
                  <div>
                    <label className="block text-xs mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.hrName || ''}
                      onChange={(e) => setApproval({ ...approval, hrName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Signature</label>
                    <input
                      type="text"
                      value={approval.hrSignature || ''}
                      onChange={(e) => setApproval({ ...approval, hrSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                      placeholder="Type signature"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.hrDate || ''}
                      onChange={(e) => setApproval({ ...approval, hrDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">COO / Executive Director</h4>
                  <div>
                    <label className="block text-xs mb-1">Name</label>
                    <input
                      type="text"
                      value={approval.cooName || ''}
                      onChange={(e) => setApproval({ ...approval, cooName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Signature</label>
                    <input
                      type="text"
                      value={approval.cooSignature || ''}
                      onChange={(e) => setApproval({ ...approval, cooSignature: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                      placeholder="COO signature"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Date</label>
                    <input
                      type="text"
                      value={approval.cooDate || ''}
                      onChange={(e) => setApproval({ ...approval, cooDate: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
              <button
                type="button"
                onClick={() => setIsMonthlyModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm transition-all"
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

          </motion.div>
        )}
      </div>

      {/* Monthly Report Modal */}
      <AnimatePresence>
        {isMonthlyModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-start pt-10 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-850 overflow-hidden mb-10 text-slate-700 dark:text-slate-200"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="text-indigo-600 dark:text-indigo-400" size={20} />
                    Monthly Report Consolidation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consolidate, edit, and download HR operations reports for a specific date range.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMonthlyModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Date Selection Bar */}
                <div className="flex flex-wrap items-end gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={monthlyStartDate}
                      onChange={(e) => setMonthlyStartDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={monthlyEndDate}
                      onChange={(e) => setMonthlyEndDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchMonthlyData}
                    disabled={isMonthlyLoading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    {isMonthlyLoading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Fetch & Consolidate
                  </button>
                </div>

                {monthlyBasicDetails.dateRange ? (
                  <div className="space-y-6">
                    {/* Interactive Section Tabs */}
                    <div className="flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-850 pb-px">
                      {[
                        { id: 'recruitment', label: 'Recruitment' },
                        { id: 'attendance', label: 'Attendance & Leave' },
                        { id: 'operations', label: 'Daily & Admin Ops' },
                        { id: 'employees', label: 'Employee Mgmt' },
                        { id: 'compliance', label: 'Compliance & KPIs' },
                        { id: 'issues', label: 'Issues & Plans' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setMonthlyActiveTab(tab.id)}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                            monthlyActiveTab === tab.id
                              ? 'border-indigo-600 text-indigo-600 dark:border-lime-400 dark:text-lime-400'
                              : 'border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab Panels */}
                    <div className="min-h-[350px]">
                      {/* 1. RECRUITMENT */}
                      {monthlyActiveTab === 'recruitment' && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Recruitment Report
                          </h4>
                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                  <th className="px-4 py-3">Recruitment Activity</th>
                                  <th className="px-4 py-3 w-48">Count / Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {monthlyRecruitmentReport.map((row, i) => (
                                  <tr key={i}>
                                    <td className="px-4 py-3 font-semibold text-xs text-slate-500">{row.activity}</td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="text"
                                        value={row.countStatus}
                                        onChange={(e) => {
                                          const newArr = [...monthlyRecruitmentReport];
                                          newArr[i].countStatus = e.target.value;
                                          setMonthlyRecruitmentReport(newArr);
                                        }}
                                        className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 2. ATTENDANCE & LEAVE */}
                      {monthlyActiveTab === 'attendance' && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Attendance & Leave Report
                          </h4>
                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                  <th className="px-4 py-3">Category</th>
                                  <th className="px-4 py-3 w-48">Count</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {monthlyAttendanceLeave.map((row, i) => (
                                  <tr key={i}>
                                    <td className="px-4 py-3 font-semibold text-xs text-slate-500">{row.category}</td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="text"
                                        value={row.count}
                                        onChange={(e) => {
                                          const newArr = [...monthlyAttendanceLeave];
                                          newArr[i].count = e.target.value;
                                          setMonthlyAttendanceLeave(newArr);
                                        }}
                                        className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 3. DAILY & ADMIN OPS */}
                      {monthlyActiveTab === 'operations' && (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              Daily Operations Summary
                            </h4>
                            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                              <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3">Activity</th>
                                    <th className="px-4 py-3 w-40">Status</th>
                                    <th className="px-4 py-3">Remarks</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                  {monthlyDailyOperations.map((row, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-3 font-semibold text-xs text-slate-500">{row.activity}</td>
                                      <td className="px-4 py-3">
                                        <input
                                          type="text"
                                          value={row.status}
                                          onChange={(e) => {
                                            const newArr = [...monthlyDailyOperations];
                                            newArr[i].status = e.target.value;
                                            setMonthlyDailyOperations(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                      <td className="px-4 py-3">
                                        <input
                                          type="text"
                                          value={row.remarks}
                                          onChange={(e) => {
                                            const newArr = [...monthlyDailyOperations];
                                            newArr[i].remarks = e.target.value;
                                            setMonthlyDailyOperations(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              Admin Operations Report
                            </h4>
                            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                              <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3">Activity</th>
                                    <th className="px-4 py-3 w-40">Status</th>
                                    <th className="px-4 py-3">Remarks</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                  {monthlyAdminOperations.map((row, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-3 font-semibold text-xs text-slate-500">{row.activity}</td>
                                      <td className="px-4 py-3">
                                        <input
                                          type="text"
                                          value={row.status}
                                          onChange={(e) => {
                                            const newArr = [...monthlyAdminOperations];
                                            newArr[i].status = e.target.value;
                                            setMonthlyAdminOperations(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                      <td className="px-4 py-3">
                                        <input
                                          type="text"
                                          value={row.remarks}
                                          onChange={(e) => {
                                            const newArr = [...monthlyAdminOperations];
                                            newArr[i].remarks = e.target.value;
                                            setMonthlyAdminOperations(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. EMPLOYEE MGMT */}
                      {monthlyActiveTab === 'employees' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              Employee Management Report
                            </h4>
                            <button
                              type="button"
                              onClick={() => setMonthlyEmployeeManagement([...monthlyEmployeeManagement, { employeeName: '', department: '', attendance: '', taskStatus: '', remarks: '' }])}
                              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-lime-400 font-bold hover:underline"
                            >
                              <Plus size={14} /> Add Row
                            </button>
                          </div>
                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                  <th className="px-4 py-3">Employee Name</th>
                                  <th className="px-4 py-3">Department</th>
                                  <th className="px-4 py-3 w-40">Attendance</th>
                                  <th className="px-4 py-3 w-44">Task Status</th>
                                  <th className="px-4 py-3">Remarks</th>
                                  <th className="px-4 py-3 w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {monthlyEmployeeManagement.map((row, i) => (
                                  <tr key={i}>
                                    <td className="px-4 py-2">
                                      <input
                                        type="text"
                                        value={row.employeeName}
                                        onChange={(e) => {
                                          const newArr = [...monthlyEmployeeManagement];
                                          newArr[i].employeeName = e.target.value;
                                          setMonthlyEmployeeManagement(newArr);
                                        }}
                                        className="w-full bg-transparent border-none focus:outline-none p-0 text-sm font-semibold text-slate-700 dark:text-slate-200"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input
                                        type="text"
                                        value={row.department}
                                        onChange={(e) => {
                                          const newArr = [...monthlyEmployeeManagement];
                                          newArr[i].department = e.target.value;
                                          setMonthlyEmployeeManagement(newArr);
                                        }}
                                        className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input
                                        type="text"
                                        value={row.attendance}
                                        onChange={(e) => {
                                          const newArr = [...monthlyEmployeeManagement];
                                          newArr[i].attendance = e.target.value;
                                          setMonthlyEmployeeManagement(newArr);
                                        }}
                                        className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input
                                        type="text"
                                        value={row.taskStatus}
                                        onChange={(e) => {
                                          const newArr = [...monthlyEmployeeManagement];
                                          newArr[i].taskStatus = e.target.value;
                                          setMonthlyEmployeeManagement(newArr);
                                        }}
                                        className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input
                                        type="text"
                                        value={row.remarks}
                                        onChange={(e) => {
                                          const newArr = [...monthlyEmployeeManagement];
                                          newArr[i].remarks = e.target.value;
                                          setMonthlyEmployeeManagement(newArr);
                                        }}
                                        className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <button
                                        type="button"
                                        onClick={() => setMonthlyEmployeeManagement(monthlyEmployeeManagement.filter((_, idx) => idx !== i))}
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
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
                      )}

                      {/* 5. COMPLIANCE & KPIS */}
                      {monthlyActiveTab === 'compliance' && (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              Documentation & Compliance
                            </h4>
                            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                              <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3">Activity</th>
                                    <th className="px-4 py-3 w-48">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                  {monthlyDocumentationCompliance.map((row, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-3 font-semibold text-xs text-slate-500">{row.activity}</td>
                                      <td className="px-4 py-3">
                                        <input
                                          type="text"
                                          value={row.status}
                                          onChange={(e) => {
                                            const newArr = [...monthlyDocumentationCompliance];
                                            newArr[i].status = e.target.value;
                                            setMonthlyDocumentationCompliance(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              KPI Tracking
                            </h4>
                            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                              <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3">KPI</th>
                                    <th className="px-4 py-3 w-48">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                  {monthlyKpiTracking.map((row, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-3 font-semibold text-xs text-slate-500">{row.kpi}</td>
                                      <td className="px-4 py-3">
                                        <input
                                          type="text"
                                          value={row.status}
                                          onChange={(e) => {
                                            const newArr = [...monthlyKpiTracking];
                                            newArr[i].status = e.target.value;
                                            setMonthlyKpiTracking(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              Final Shift Handover
                            </h4>
                            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                              <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3">Handover Item</th>
                                    <th className="px-4 py-3 w-48">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                  {monthlyFinalShiftHandover.map((row, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-3 font-semibold text-xs text-slate-500">{row.item}</td>
                                      <td className="px-4 py-3">
                                        <input
                                          type="text"
                                          value={row.status}
                                          onChange={(e) => {
                                            const newArr = [...monthlyFinalShiftHandover];
                                            newArr[i].status = e.target.value;
                                            setMonthlyFinalShiftHandover(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 6. ISSUES & PLANS */}
                      {monthlyActiveTab === 'issues' && (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Issues / Escalations
                              </h4>
                              <button
                                type="button"
                                onClick={() => setMonthlyIssuesEscalations([...monthlyIssuesEscalations, { issue: '', priority: 'High / Medium / Low', actionTaken: '' }])}
                                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-lime-400 font-bold hover:underline"
                              >
                                <Plus size={14} /> Add Issue
                              </button>
                            </div>
                            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                              <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3">Issue</th>
                                    <th className="px-4 py-3 w-44">Priority</th>
                                    <th className="px-4 py-3">Action Taken</th>
                                    <th className="px-4 py-3 w-10"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                  {monthlyIssuesEscalations.map((row, i) => (
                                    <tr key={i}>
                                      <td className="px-4 py-2">
                                        <input
                                          type="text"
                                          value={row.issue}
                                          onChange={(e) => {
                                            const newArr = [...monthlyIssuesEscalations];
                                            newArr[i].issue = e.target.value;
                                            setMonthlyIssuesEscalations(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm font-semibold text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <select
                                          value={row.priority}
                                          onChange={(e) => {
                                            const newArr = [...monthlyIssuesEscalations];
                                            newArr[i].priority = e.target.value;
                                            setMonthlyIssuesEscalations(newArr);
                                          }}
                                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-xs focus:outline-none text-slate-700 dark:text-slate-200"
                                        >
                                          <option value="High / Medium / Low">High / Medium / Low</option>
                                          <option value="High">High</option>
                                          <option value="Medium">Medium</option>
                                          <option value="Low">Low</option>
                                        </select>
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="text"
                                          value={row.actionTaken}
                                          onChange={(e) => {
                                            const newArr = [...monthlyIssuesEscalations];
                                            newArr[i].actionTaken = e.target.value;
                                            setMonthlyIssuesEscalations(newArr);
                                          }}
                                          className="w-full bg-transparent border-none focus:outline-none p-0 text-sm text-slate-700 dark:text-slate-200"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <button
                                          type="button"
                                          onClick={() => setMonthlyIssuesEscalations(monthlyIssuesEscalations.filter((_, idx) => idx !== i))}
                                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
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

                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              Next Day Action Plan (Consolidated)
                            </h4>
                            <textarea
                              value={monthlyNextDayActionPlan}
                              onChange={(e) => setMonthlyNextDayActionPlan(e.target.value)}
                              className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[120px] text-slate-700 dark:text-slate-200"
                            />
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              HR / Admin Comments (Consolidated)
                            </h4>
                            <textarea
                              value={monthlyHrAdminComments}
                              onChange={(e) => setMonthlyHrAdminComments(e.target.value)}
                              className="w-full bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[120px] text-slate-700 dark:text-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-450 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    Select a date range and click "Fetch & Consolidate" to begin editing.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-150 dark:border-slate-850 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMonthlyModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                >
                  Cancel
                </button>
                {monthlyBasicDetails.dateRange && (
                  <button
                    type="button"
                    onClick={handleDownloadMonthlyPDF}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/10"
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

export default HrReportPage;
