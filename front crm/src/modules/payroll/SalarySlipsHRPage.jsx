import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Printer, 
  Trash2, 
  Edit3, 
  Eye, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertCircle, 
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  MoreVertical,
  Calendar,
  Lock,
  RefreshCw
} from 'lucide-react';
import { 
  getSalarySlips, 
  createSalarySlip, 
  updateSalarySlip, 
  publishSalarySlip, 
  emailSalarySlip, 
  deleteSalarySlip 
} from '../../services/hrSalarySlipService';
import axios from 'axios';
import * as XLSX from 'xlsx';

const rawApiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 6 }, (_, i) => 2025 + i);

const SalarySlipsHRPage = () => {
  const [loading, setLoading] = useState(true);
  const [slips, setSlips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [user, setUser] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalSlips, setTotalSlips] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Popovers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [createStep, setCreateStep] = useState(1);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    workingDays: 26,
    daysWorked: 26,
    basicSalary: '',
    houseRentAllowance: 0,
    specialAllowance: 0,
    transportAllowance: 0,
    otherAllowance: 0,
    kodbrandIntegrityAward: 0,
    advanceSalary: 0,
    providentFund: 0,
    professionalTax: 0,
    incomeTax: 0,
    unpaidLeaveDeduction: 0,
    otherDeductions: 0,
    remarks: '',
    location: 'Malappuram'
  });
  const [isCreateFormExpanded, setIsCreateFormExpanded] = useState(true);

  // Edit Form State
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({});

  const showToastMsg = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);

  // Fetch initial helper data (employees & departments)
  const fetchHelperData = async () => {
    try {
      const headers = getAuthHeaders();
      const empRes = await fetch(`${API_URL}/users/list`, { headers });
      const empData = await empRes.json();
      if (Array.isArray(empData)) {
        setEmployees(empData);
      } else if (empData.success && Array.isArray(empData.data)) {
        setEmployees(empData.data);
      }

      // Fetch departments
      const deptRes = await fetch(`${API_URL}/departments`, { headers });
      const deptData = await deptRes.json();
      if (deptData.success && Array.isArray(deptData.data)) {
        setDepartments(deptData.data);
      } else if (Array.isArray(deptData)) {
        setDepartments(deptData);
      }
    } catch (err) {
      console.error('Failed to load helpers:', err);
    }
  };

  // Fetch salary slips matching filters & page
  const fetchSlips = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        month: month || undefined,
        year: year || undefined,
        status: status || undefined,
        department: department || undefined,
        page,
        limit
      };
      const res = await getSalarySlips(params);
      if (res.success) {
        setSlips(res.data.slips || []);
        setTotalSlips(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch slips:', err);
      showToastMsg(err.message || 'Failed to fetch salary slips', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchHelperData();
  }, []);

  useEffect(() => {
    fetchSlips();
  }, [search, month, year, status, department, page, limit]);

  // Selected employee metadata helper for creation
  const selectedEmployeeMeta = useMemo(() => {
    if (!createForm.employeeId) return null;
    return employees.find(e => String(e._id) === String(createForm.employeeId));
  }, [createForm.employeeId, employees]);

  // Handle employee dropdown select during create
  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => String(e._id) === String(empId));
    setCreateForm(prev => ({
      ...prev,
      employeeId: empId,
      basicSalary: emp?.salary || '',
      // default allowances/deductions reset if needed
      houseRentAllowance: 0,
      specialAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
      kodbrandIntegrityAward: 0,
      advanceSalary: 0,
      providentFund: 0,
      professionalTax: 0,
      incomeTax: 0,
      unpaidLeaveDeduction: 0,
      otherDeductions: 0
    }));
  };

  // Live total calculations for Create Step 2
  const createTotals = useMemo(() => {
    const basic = parseFloat(createForm.basicSalary) || 0;
    const earnings = basic + 
      (parseFloat(createForm.houseRentAllowance) || 0) + 
      (parseFloat(createForm.specialAllowance) || 0) + 
      (parseFloat(createForm.transportAllowance) || 0) + 
      (parseFloat(createForm.otherAllowance) || 0) + 
      (parseFloat(createForm.kodbrandIntegrityAward) || 0);

    const deductions = 
      (parseFloat(createForm.advanceSalary) || 0) + 
      (parseFloat(createForm.providentFund) || 0) + 
      (parseFloat(createForm.professionalTax) || 0) + 
      (parseFloat(createForm.incomeTax) || 0) + 
      (parseFloat(createForm.unpaidLeaveDeduction) || 0) + 
      (parseFloat(createForm.otherDeductions) || 0);

    return {
      earnings,
      deductions,
      netPay: earnings - deductions
    };
  }, [createForm]);

  // Live total calculations for Edit mode
  const editTotals = useMemo(() => {
    if (!editForm.basicSalary) return { earnings: 0, deductions: 0, netPay: 0 };
    const basic = parseFloat(editForm.basicSalary) || 0;
    const earnings = basic + 
      (parseFloat(editForm.houseRentAllowance) || 0) + 
      (parseFloat(editForm.specialAllowance) || 0) + 
      (parseFloat(editForm.transportAllowance) || 0) + 
      (parseFloat(editForm.otherAllowance) || 0) + 
      (parseFloat(editForm.kodbrandIntegrityAward) || 0);

    const deductions = 
      (parseFloat(editForm.advanceSalary) || 0) + 
      (parseFloat(editForm.providentFund) || 0) + 
      (parseFloat(editForm.professionalTax) || 0) + 
      (parseFloat(editForm.incomeTax) || 0) + 
      (parseFloat(editForm.unpaidLeaveDeduction) || 0) + 
      (parseFloat(editForm.otherDeductions) || 0);

    return {
      earnings,
      deductions,
      netPay: earnings - deductions
    };
  }, [editForm]);

  // Step 1 Validation & Next
  const handleStep1Continue = () => {
    setCreateError('');
    if (!createForm.employeeId) {
      setCreateError('Please select an employee');
      return;
    }
    if (!createForm.month || !createForm.year) {
      setCreateError('Please select month and year');
      return;
    }

    // Check future date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (createForm.year > currentYear || (Number(createForm.year) === currentYear && Number(createForm.month) > currentMonth)) {
      setCreateError('Cannot generate salary slips for future months');
      return;
    }

    setCreateStep(2);
  };

  // Step 2 Validation & Next
  const handleStep2Continue = () => {
    setCreateError('');
    const basic = parseFloat(createForm.basicSalary);
    if (isNaN(basic) || basic < 0 || basic > 500000) {
      setCreateError('Basic Salary must be between ₹0 and ₹500,000');
      return;
    }
    setCreateStep(3);
  };

  // Final Create Submit
  const handleCreateSubmit = async (publishImmediate = false) => {
    setCreateError('');
    setIsSubmitting(true);

    const daysW = parseInt(createForm.daysWorked);
    const totalW = parseInt(createForm.workingDays);
    if (isNaN(daysW) || daysW < 0 || daysW > totalW) {
      setCreateError(`Days Worked must be between 0 and ${totalW}`);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...createForm,
        basicSalary: Number(createForm.basicSalary),
        houseRentAllowance: Number(createForm.houseRentAllowance),
        specialAllowance: Number(createForm.specialAllowance),
        transportAllowance: Number(createForm.transportAllowance),
        otherAllowance: Number(createForm.otherAllowance),
        kodbrandIntegrityAward: Number(createForm.kodbrandIntegrityAward),
        advanceSalary: Number(createForm.advanceSalary),
        providentFund: Number(createForm.providentFund),
        professionalTax: Number(createForm.professionalTax),
        incomeTax: Number(createForm.incomeTax),
        unpaidLeaveDeduction: Number(createForm.unpaidLeaveDeduction),
        otherDeductions: Number(createForm.otherDeductions),
        workingDays: Number(createForm.workingDays),
        daysWorked: Number(createForm.daysWorked)
      };

      const res = await createSalarySlip(payload);
      if (res.success) {
        const newSlip = res.data;
        if (publishImmediate) {
          showToastMsg('Publishing salary slip...');
          await publishSalarySlip(newSlip._id);
          showToastMsg('Salary slip generated, published and emailed!');
        } else {
          showToastMsg('Salary slip saved as Draft successfully');
        }
        setShowCreateModal(false);
        resetCreateForm();
        fetchSlips();
      }
    } catch (err) {
      console.error(err);
      setCreateError(err.message || 'Failed to save salary slip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlineCreateSubmit = async (publishImmediate = false) => {
    setCreateError('');
    setIsSubmitting(true);

    if (!createForm.employeeId) {
      setCreateError('Please select an employee');
      setIsSubmitting(false);
      return;
    }

    const basic = parseFloat(createForm.basicSalary);
    if (isNaN(basic) || basic < 0 || basic > 500000) {
      setCreateError('Basic Salary must be between ₹0 and ₹500,000');
      setIsSubmitting(false);
      return;
    }

    const daysW = parseInt(createForm.daysWorked);
    const totalW = parseInt(createForm.workingDays);
    if (isNaN(daysW) || daysW < 0 || daysW > totalW) {
      setCreateError(`Days Worked must be between 0 and ${totalW}`);
      setIsSubmitting(false);
      return;
    }

    // Check future date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (createForm.year > currentYear || (Number(createForm.year) === currentYear && Number(createForm.month) > currentMonth)) {
      setCreateError('Cannot generate salary slips for future months');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...createForm,
        basicSalary: Number(createForm.basicSalary),
        houseRentAllowance: Number(createForm.houseRentAllowance),
        specialAllowance: Number(createForm.specialAllowance),
        transportAllowance: Number(createForm.transportAllowance),
        otherAllowance: Number(createForm.otherAllowance),
        kodbrandIntegrityAward: Number(createForm.kodbrandIntegrityAward),
        advanceSalary: Number(createForm.advanceSalary),
        providentFund: Number(createForm.providentFund),
        professionalTax: Number(createForm.professionalTax),
        incomeTax: Number(createForm.incomeTax),
        unpaidLeaveDeduction: Number(createForm.unpaidLeaveDeduction),
        otherDeductions: Number(createForm.otherDeductions),
        workingDays: Number(createForm.workingDays),
        daysWorked: Number(createForm.daysWorked)
      };

      const res = await createSalarySlip(payload);
      if (res.success) {
        const newSlip = res.data;
        if (publishImmediate) {
          showToastMsg('Publishing salary slip...');
          await publishSalarySlip(newSlip._id);
          showToastMsg('Salary slip generated, published and emailed!');
        } else {
          showToastMsg('Salary slip saved as Draft successfully');
        }
        resetCreateForm();
        fetchSlips();
      }
    } catch (err) {
      console.error(err);
      setCreateError(err.message || 'Failed to save salary slip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setCreateStep(1);
    setCreateError('');
    setCreateForm({
      employeeId: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      workingDays: 26,
      daysWorked: 26,
      basicSalary: '',
      houseRentAllowance: 0,
      specialAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
      kodbrandIntegrityAward: 0,
      advanceSalary: 0,
      providentFund: 0,
      professionalTax: 0,
      incomeTax: 0,
      unpaidLeaveDeduction: 0,
      otherDeductions: 0,
      remarks: '',
      location: 'Malappuram'
    });
  };

  // Trigger manual publish from list or view
  const handlePublishSlip = async (id) => {
    if (!window.confirm('Are you sure you want to publish this salary slip? This will lock editing and dispatch the slip PDF to the employee email.')) return;
    try {
      showToastMsg('Publishing salary slip and sending email...');
      const res = await publishSalarySlip(id);
      if (res.success) {
        showToastMsg('Salary slip published and emailed successfully!');
        fetchSlips();
        if (selectedSlip && String(selectedSlip._id) === String(id)) {
          setSelectedSlip(res.data);
        }
      }
    } catch (err) {
      showToastMsg(err.message || 'Publishing failed', 'error');
    }
  };

  // Dispatch Email manually
  const handleEmailSlip = async (id, name) => {
    try {
      showToastMsg(`Dispatching slip to ${name} via email...`);
      const res = await emailSalarySlip(id);
      if (res.success) {
        showToastMsg(`Salary slip emailed to ${name} successfully!`);
      }
    } catch (err) {
      showToastMsg(err.message || 'Email dispatch failed', 'error');
    }
  };

  // Download PDF slip from API
  const handleDownloadPDFSlip = async (id, employeeName, monthNum, yearNum) => {
    try {
      showToastMsg('Generating slip PDF...');
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/"/g, '') : '';
      const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;

      const response = await axios.get(`${API_URL}/hr/salary-slips/${id}/download-pdf`, {
        headers: { Authorization: authHeader },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SalarySlip_${employeeName.replace(/\s+/g, '_')}_${MONTHS[monthNum - 1]}_${yearNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToastMsg('Download completed');
    } catch (err) {
      showToastMsg(err.message || 'Failed to download slip PDF', 'error');
    }
  };

  // Direct Print Preview window trigger
  const handlePrintSlip = () => {
    const printContent = document.getElementById('hr-salary-slip-printable');
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #hr-salary-slip-printable, #hr-salary-slip-printable * { visibility: visible; }
        #hr-salary-slip-printable { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; padding: 0; margin: 0; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  // Edit Form Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setIsSubmitting(true);

    const basic = parseFloat(editForm.basicSalary);
    if (isNaN(basic) || basic < 0 || basic > 500000) {
      setEditError('Basic Salary must be between ₹0 and ₹500,000');
      setIsSubmitting(false);
      return;
    }

    const daysW = parseInt(editForm.daysWorked);
    const totalW = parseInt(editForm.workingDays);
    if (isNaN(daysW) || daysW < 0 || daysW > totalW) {
      setEditError(`Days Worked must be between 0 and ${totalW}`);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...editForm,
        basicSalary: Number(editForm.basicSalary),
        houseRentAllowance: Number(editForm.houseRentAllowance),
        specialAllowance: Number(editForm.specialAllowance),
        transportAllowance: Number(editForm.transportAllowance),
        otherAllowance: Number(editForm.otherAllowance),
        kodbrandIntegrityAward: Number(editForm.kodbrandIntegrityAward),
        advanceSalary: Number(editForm.advanceSalary),
        providentFund: Number(editForm.providentFund),
        professionalTax: Number(editForm.professionalTax),
        incomeTax: Number(editForm.incomeTax),
        unpaidLeaveDeduction: Number(editForm.unpaidLeaveDeduction),
        otherDeductions: Number(editForm.otherDeductions),
        workingDays: Number(editForm.workingDays),
        daysWorked: Number(editForm.daysWorked)
      };

      const res = await updateSalarySlip(selectedSlip._id, payload);
      if (res.success) {
        showToastMsg('Salary slip updated successfully');
        setSelectedSlip(res.data);
        setEditMode(false);
        fetchSlips();
      }
    } catch (err) {
      console.error(err);
      setEditError(err.message || 'Failed to update salary slip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditMode = () => {
    setEditForm({
      basicSalary: selectedSlip.basicSalary || '',
      houseRentAllowance: selectedSlip.houseRentAllowance || 0,
      specialAllowance: selectedSlip.specialAllowance || 0,
      transportAllowance: selectedSlip.transportAllowance || 0,
      otherAllowance: selectedSlip.otherAllowance || 0,
      kodbrandIntegrityAward: selectedSlip.kodbrandIntegrityAward || 0,
      advanceSalary: selectedSlip.advanceSalary || 0,
      providentFund: selectedSlip.providentFund || 0,
      professionalTax: selectedSlip.professionalTax || 0,
      incomeTax: selectedSlip.incomeTax || 0,
      unpaidLeaveDeduction: selectedSlip.unpaidLeaveDeduction || 0,
      otherDeductions: selectedSlip.otherDeductions || 0,
      workingDays: selectedSlip.workingDays || 26,
      daysWorked: selectedSlip.daysWorked || 26,
      remarks: selectedSlip.remarks || '',
      location: selectedSlip.location || 'Malappuram'
    });
    setEditError('');
    setEditMode(true);
  };

  // Delete Slip (Draft only)
  const handleDeleteSlip = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this Draft salary slip? This action is irreversible.')) return;
    try {
      const res = await deleteSalarySlip(id);
      if (res.success) {
        showToastMsg('Salary slip deleted successfully');
        fetchSlips();
        if (showViewModal) setShowViewModal(false);
      }
    } catch (err) {
      showToastMsg(err.message || 'Failed to delete slip', 'error');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (slips.length === 0) {
      showToastMsg('No salary slips found to export', 'error');
      return;
    }
    const exportData = slips.map(slip => ({
      "Employee ID": slip.employeeId?.employeeId || 'N/A',
      "Employee Name": slip.employeeId?.name || 'N/A',
      "Department": slip.employeeId?.department || 'N/A',
      "Designation": slip.employeeId?.designationId?.name || slip.employeeId?.designation || 'Staff',
      "Month": MONTHS[slip.month - 1],
      "Year": slip.year,
      "Working Days": slip.workingDays,
      "Days Worked": slip.daysWorked,
      "Basic Salary": slip.basicSalary,
      "Total Earnings": slip.totalEarnings,
      "Total Deductions": slip.totalDeductions,
      "Net Pay (₹)": slip.netPay,
      "Status": slip.status,
      "Generated Date": new Date(slip.createdAt).toLocaleDateString('en-IN')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Salary Slips");
    XLSX.writeFile(wb, `KODbrand_SalarySlips_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToastMsg('Excel file exported successfully');
  };

  const handleResetFilters = () => {
    setSearch('');
    setMonth('');
    setYear('');
    setStatus('');
    setDepartment('');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-20">
      
      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[9999] px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-black uppercase tracking-wider
              ${toast.type === 'error' 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:bg-rose-950/20' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:bg-emerald-950/20'
              }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Salary Slips</h1>
          <p className="text-slate-400 text-xs mt-1">Manage and generate official KOD.brand salary slip disbursements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-2xl shadow-sm transition-all"
          >
            <FileSpreadsheet size={15} className="text-emerald-500" />
            <span>Export to Excel</span>
          </button>
          
          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0B1F4B] hover:bg-[#0B1F4B]/90 text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-md transition-all"
          >
            <Plus size={16} />
            <span>Generate New Salary Slip</span>
          </button>
        </div>
      </div>

      {/* QUICK INLINE CREATE PANEL */}
      <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div 
          className="flex justify-between items-center cursor-pointer select-none" 
          onClick={() => setIsCreateFormExpanded(!isCreateFormExpanded)}
        >
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-[#0B1F4B]/10 dark:bg-[#0B1F4B]/40 text-[#0B1F4B] dark:text-[#4DB848] rounded-xl">
              <Plus size={16} />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Quick Add Salary Slip</h3>
              <p className="text-[10px] text-slate-400">Fill in details below to instantly add a new salary slip for an employee.</p>
            </div>
          </div>
          <button 
            type="button"
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
          >
            {isCreateFormExpanded ? 'Collapse' : 'Expand Form'}
          </button>
        </div>

        {isCreateFormExpanded && (
          <div className="mt-6 border-t border-slate-200/50 dark:border-slate-800/50 pt-5 space-y-5">
            {createError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-2.5 text-xs font-semibold">
                <AlertCircle size={15} />
                <span>{createError}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* COLUMN 1: EMPLOYEE & PERIOD DETAILS */}
              <div className="space-y-4 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl bg-white/50 dark:bg-slate-950/20">
                <h4 className="text-xs font-black text-[#0B1F4B] dark:text-[#4DB848] uppercase tracking-wide border-b border-slate-100 dark:border-slate-850 pb-2">1. Employee & Period</h4>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Employee *</label>
                    <select
                      value={createForm.employeeId}
                      onChange={(e) => handleEmployeeChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="">Choose employee...</option>
                      {employees.map(e => (
                        <option key={e._id} value={e._id}>{e.name} ({e.employeeId || 'No Code'})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Month *</label>
                      <select
                        value={createForm.month}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, month: Number(e.target.value) }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:outline-none"
                      >
                        {MONTHS.map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Year *</label>
                      <select
                        value={createForm.year}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:outline-none"
                      >
                        {YEARS.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Working Days</label>
                      <input
                        type="number"
                        value={createForm.workingDays}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, workingDays: Number(e.target.value) }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Days Worked</label>
                      <input
                        type="number"
                        value={createForm.daysWorked}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, daysWorked: Number(e.target.value) }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Office Location</label>
                    <select
                      value={createForm.location}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="Malappuram">Malappuram</option>
                      <option value="Calicut">Calicut</option>
                      <option value="Cochin">Cochin</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: EARNINGS */}
              <div className="space-y-4 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl bg-white/50 dark:bg-slate-955/20">
                <h4 className="text-xs font-black text-[#0B1F4B] dark:text-[#4DB848] uppercase tracking-wide border-b border-slate-100 dark:border-slate-850 pb-2">2. Earnings (INR)</h4>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Basic Salary *</label>
                    <input
                      type="number"
                      value={createForm.basicSalary}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                      placeholder="e.g. 25000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">HRA</label>
                    <input
                      type="number"
                      value={createForm.houseRentAllowance}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, houseRentAllowance: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Special Allowance</label>
                    <input
                      type="number"
                      value={createForm.specialAllowance}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, specialAllowance: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Transport</label>
                    <input
                      type="number"
                      value={createForm.transportAllowance}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, transportAllowance: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Other</label>
                    <input
                      type="number"
                      value={createForm.otherAllowance}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, otherAllowance: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider text-[#4DB848] font-bold">KOD.brand Integrity Award</label>
                    <input
                      type="number"
                      value={createForm.kodbrandIntegrityAward}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, kodbrandIntegrityAward: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-[#4DB848]/35 bg-white dark:bg-slate-955 text-slate-850 dark:text-white focus:ring-[#4DB848]"
                    />
                  </div>
                </div>
              </div>

              {/* COLUMN 3: DEDUCTIONS */}
              <div className="space-y-4 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl bg-white/50 dark:bg-slate-955/20">
                <h4 className="text-xs font-black text-rose-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-850 pb-2">3. Deductions (INR)</h4>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Advance Salary</label>
                    <input
                      type="number"
                      value={createForm.advanceSalary}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, advanceSalary: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">PF</label>
                    <input
                      type="number"
                      value={createForm.providentFund}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, providentFund: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Prof. Tax</label>
                    <input
                      type="number"
                      value={createForm.professionalTax}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, professionalTax: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Income Tax (TDS)</label>
                    <input
                      type="number"
                      value={createForm.incomeTax}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, incomeTax: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Unpaid Leave</label>
                    <input
                      type="number"
                      value={createForm.unpaidLeaveDeduction}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, unpaidLeaveDeduction: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Other</label>
                    <input
                      type="number"
                      value={createForm.otherDeductions}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, otherDeductions: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-850 dark:text-white"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Remarks & Totals Block */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks / Notes</label>
                <input
                  type="text"
                  value={createForm.remarks}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Add remarks or notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                />
              </div>
              
              {/* Calculated Net Pay Highlight */}
              <div className="p-4 border-2 border-[#4DB848]/40 bg-[#4DB848]/5 dark:bg-[#4DB848]/10 rounded-2xl flex justify-between items-center text-xs">
                <div className="flex flex-col">
                  <span className="font-black uppercase text-[#0B1F4B] dark:text-[#4DB848] tracking-widest text-[9px]">Calculated Net Pay</span>
                  <span className="text-[8px] text-slate-400 font-medium">Earnings: ₹{createTotals.earnings.toLocaleString('en-IN')} | Ded: ₹{createTotals.deductions.toLocaleString('en-IN')}</span>
                </div>
                <span className="text-base font-mono font-black text-[#4DB848]">₹{createTotals.netPay.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Inline Form Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
              <button
                type="button"
                onClick={() => resetCreateForm()}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs font-bold rounded-xl"
              >
                Clear Form
              </button>
              <button
                type="button"
                onClick={() => handleInlineCreateSubmit(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-355 text-xs font-black uppercase tracking-wider rounded-xl disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleInlineCreateSubmit(true)}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-650 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check size={14} className="text-white" />
                <span>Publish & Send</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md p-5 rounded-3xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search employee / ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Month Dropdown */}
          <select
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Months</option>
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Years</option>
            {YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d._id || d.name} value={d.name}>{d.name}</option>
            ))}
            {/* Fallbacks */}
            {!departments.some(d => d.name === 'Human Resources') && <option value="Human Resources">Human Resources</option>}
            {!departments.some(d => d.name === 'Development') && <option value="Development">Development</option>}
            {!departments.some(d => d.name === 'Marketing') && <option value="Marketing">Marketing</option>}
            {!departments.some(d => d.name === 'Finance') && <option value="Finance">Finance</option>}
          </select>

          {/* Status Filter */}
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>

            <button
              onClick={handleResetFilters}
              className="px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-colors"
              title="Reset Filters"
            >
              <RefreshCw size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* TABLE LIST VIEW */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 text-slate-400 gap-3">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-3 border-[#0B1F4B] border-t-transparent rounded-full"
            />
            <span className="text-xs uppercase tracking-widest font-black">Loading Slips...</span>
          </div>
        ) : slips.length === 0 ? (
          <div className="py-24 text-center text-slate-400 text-xs uppercase tracking-wider font-semibold">
            No salary slips found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4">Employee ID</th>
                  <th className="p-4">Employee Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Month/Year</th>
                  <th className="p-4">Net Pay (₹)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Generated Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {slips.map((slip) => {
                  const empName = slip.employeeId?.name || 'N/A';
                  const empCode = slip.employeeId?.employeeId || 'N/A';
                  const empDept = slip.employeeId?.department || 'N/A';
                  const monthYear = `${MONTHS[slip.month - 1]} ${slip.year}`;
                  const genDate = new Date(slip.createdAt).toLocaleDateString('en-IN');

                  return (
                    <tr key={slip._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-650 dark:text-slate-355">{empCode}</td>
                      <td className="p-4 font-extrabold text-slate-800 dark:text-white">{empName}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-semibold">{empDept}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-bold">{monthYear}</td>
                      <td className="p-4 font-mono font-black text-[#0B1F4B] dark:text-white">
                        ₹{(slip.netPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider
                          ${slip.status === 'Published' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : slip.status === 'Archived'
                              ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20 dark:text-slate-400'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {slip.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-455 font-semibold">{genDate}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSlip(slip);
                              setEditMode(false);
                              setShowViewModal(true);
                            }}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            title="View Payslip"
                          >
                            <Eye size={13} />
                          </button>
                          
                          {slip.status === 'Draft' && (
                            <button
                              onClick={() => {
                                setSelectedSlip(slip);
                                handleOpenEditMode();
                                setShowViewModal(true);
                              }}
                              className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                              title="Edit Slip"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDownloadPDFSlip(slip._id, empName, slip.month, slip.year)}
                            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            title="Download PDF"
                          >
                            <Download size={13} />
                          </button>

                          {slip.status === 'Published' && (
                            <button
                              onClick={() => handleEmailSlip(slip._id, empName)}
                              className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 hover:bg-indigo-555 hover:text-white rounded-xl text-slate-500 transition-all"
                              title="Send Email"
                            >
                              <Mail size={13} />
                            </button>
                          )}

                          {slip.status === 'Draft' && (
                            <button
                              onClick={() => handleDeleteSlip(slip._id)}
                              className="p-2 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-rose-500 hover:text-rose-700 transition-colors"
                              title="Delete Slip"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION SECTION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalSlips)} of {totalSlips} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronLeft size={14} />
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, idx) => (
                  <button
                    key={idx + 1}
                    onClick={() => setPage(idx + 1)}
                    className={`w-8 h-8 rounded-xl text-[10px] font-black tracking-wider transition-all
                      ${page === idx + 1 
                        ? 'bg-[#0B1F4B] text-white shadow-md' 
                        : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GENERATE SALARY SLIP MODAL (3 Steps) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden my-8"
          >
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Generate New Salary Slip</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Wizard Progress: Step {createStep} of 3</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-650 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 flex">
              <div className={`h-full bg-[#4DB848] transition-all duration-350 ${createStep === 1 ? 'w-1/3' : createStep === 2 ? 'w-2/3' : 'w-full'}`} />
            </div>

            <div className="p-6">
              {createError && (
                <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-2.5 text-xs font-semibold">
                  <AlertCircle size={15} />
                  <span>{createError}</span>
                </div>
              )}

              {/* STEP 1: Employee & Period Selection */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-slate-55/20 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-[#0B1F4B] dark:text-[#4DB848] tracking-wider">Step 1: Select Employee & Period</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Employee dropdown */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee *</label>
                      <select
                        value={createForm.employeeId}
                        onChange={(e) => handleEmployeeChange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                      >
                        <option value="">Select Employee...</option>
                        {employees.map(e => (
                          <option key={e._id} value={e._id}>{e.name} ({e.employeeId || 'No Code'})</option>
                        ))}
                      </select>
                    </div>

                    {/* Period Month / Year */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Month *</label>
                        <select
                          value={createForm.month}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, month: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                        >
                          {MONTHS.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Year *</label>
                        <select
                          value={createForm.year}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                        >
                          {YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Department (auto-filled, disabled) */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Department (Auto-filled)</label>
                      <input
                        type="text"
                        value={selectedEmployeeMeta?.department || ''}
                        disabled
                        placeholder="N/A"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs disabled:opacity-75"
                      />
                    </div>

                    {/* Designation (auto-filled, disabled) */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Designation (Auto-filled)</label>
                      <input
                        type="text"
                        value={selectedEmployeeMeta?.designationId?.name || selectedEmployeeMeta?.designation || ''}
                        disabled
                        placeholder="N/A"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs disabled:opacity-75"
                      />
                    </div>

                    {/* Location Selection */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Office Location</label>
                      <select
                        value={createForm.location}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                      >
                        <option value="Malappuram">Malappuram</option>
                        <option value="Calicut">Calicut</option>
                        <option value="Cochin">Cochin</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 2: Earnings & Deductions Breakdown */}
              {createStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-slate-55/20 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-[#0B1F4B] dark:text-[#4DB848] tracking-wider">Step 2: Enter Earnings & Deductions</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    
                    {/* LEFT COLUMN: EARNINGS */}
                    <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-950/10">
                      <h4 className="text-xs font-black text-[#0B1F4B] dark:text-[#4DB848] uppercase tracking-wide border-b border-slate-200/50 dark:border-slate-800 pb-1.5">Earnings</h4>
                      
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="col-span-2 space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Basic Salary *</label>
                          <input
                            type="number"
                            value={createForm.basicSalary}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                            placeholder="e.g. 25000"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">House Rent Allowance</label>
                          <input
                            type="number"
                            value={createForm.houseRentAllowance}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, houseRentAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Special Allowance</label>
                          <input
                            type="number"
                            value={createForm.specialAllowance}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, specialAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Transport Allowance</label>
                          <input
                            type="number"
                            value={createForm.transportAllowance}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, transportAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Other Allowance</label>
                          <input
                            type="number"
                            value={createForm.otherAllowance}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, otherAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider text-[#4DB848] font-bold">KOD.brand Integrity Award</label>
                          <input
                            type="number"
                            value={createForm.kodbrandIntegrityAward}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, kodbrandIntegrityAward: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-[#4DB848]/35 bg-white dark:bg-slate-950 text-xs focus:ring-[#4DB848]"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-200/50 dark:border-slate-800 pt-3 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-500 uppercase tracking-wider">Total Earnings:</span>
                        <span className="font-mono font-black text-slate-800 dark:text-white">₹{createTotals.earnings.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: DEDUCTIONS */}
                    <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-950/10">
                      <h4 className="text-xs font-black text-rose-500 uppercase tracking-wide border-b border-slate-200/50 dark:border-slate-800 pb-1.5">Deductions</h4>
                      
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Advance Salary</label>
                          <input
                            type="number"
                            value={createForm.advanceSalary}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, advanceSalary: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Provident Fund (PF)</label>
                          <input
                            type="number"
                            value={createForm.providentFund}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, providentFund: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Professional Tax</label>
                          <input
                            type="number"
                            value={createForm.professionalTax}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, professionalTax: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Income Tax (TDS)</label>
                          <input
                            type="number"
                            value={createForm.incomeTax}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, incomeTax: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Unpaid Leave Deduction</label>
                          <input
                            type="number"
                            value={createForm.unpaidLeaveDeduction}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, unpaidLeaveDeduction: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Other Deductions</label>
                          <input
                            type="number"
                            value={createForm.otherDeductions}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, otherDeductions: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-200/50 dark:border-slate-800 pt-3 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-500 uppercase tracking-wider">Total Deductions:</span>
                        <span className="font-mono font-black text-slate-850 dark:text-white">₹{createTotals.deductions.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                  </div>

                  {/* NET PAY BOX HIGHLIGHT */}
                  <div className="p-4 border-2 border-[#4DB848]/40 bg-[#4DB848]/5 dark:bg-[#4DB848]/10 rounded-2xl flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-[#0B1F4B] dark:text-[#4DB848] tracking-widest">Calculated Net Pay (In-Hand)</span>
                    <span className="text-lg font-mono font-black text-[#4DB848]">₹{createTotals.netPay.toLocaleString('en-IN')}</span>
                  </div>

                </div>
              )}

              {/* STEP 3: Attendance & Final confirmation */}
              {createStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-slate-55/20 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-[#0B1F4B] dark:text-[#4DB848] tracking-wider">Step 3: Enter Attendance & Details</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Working Days */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Working Days *</label>
                      <input
                        type="number"
                        value={createForm.workingDays}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, workingDays: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                      />
                    </div>

                    {/* Days Worked */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Days Worked *</label>
                      <input
                        type="number"
                        value={createForm.daysWorked}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, daysWorked: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                      />
                    </div>

                    {/* Days on Leave (auto-calculated) */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Days on Leave (Auto-calculated)</label>
                      <input
                        type="number"
                        value={Number(createForm.workingDays || 0) - Number(createForm.daysWorked || 0)}
                        disabled
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 text-xs disabled:opacity-75"
                      />
                    </div>

                    {/* Remarks */}
                    <div className="col-span-3 space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks / Notes</label>
                      <textarea
                        value={createForm.remarks}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, remarks: e.target.value }))}
                        placeholder="Add remarks or notes..."
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                      />
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer (Wizard Buttons) */}
            <div className="flex justify-between items-center p-6 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                {createStep > 1 && (
                  <button
                    onClick={() => setCreateStep(s => s - 1)}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-350 text-xs font-bold rounded-2xl"
                  >
                    <ChevronLeft size={14} />
                    <span>Back</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {createStep < 3 ? (
                  <button
                    onClick={createStep === 1 ? handleStep1Continue : handleStep2Continue}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0B1F4B] hover:bg-[#0B1F4B]/95 text-white text-xs font-black uppercase tracking-wider rounded-2xl"
                  >
                    <span>Continue</span>
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleCreateSubmit(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-black uppercase tracking-wider rounded-2xl disabled:opacity-50"
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => handleCreateSubmit(true)}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-emerald-650 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check size={14} />
                      Publish & Send
                    </button>
                  </>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}

      {/* VIEW & EDIT MODAL (KOD.brand Payslip Format) */}
      {showViewModal && selectedSlip && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8"
          >
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Payslip Module
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider
                  ${selectedSlip.status === 'Published' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : selectedSlip.status === 'Archived' 
                      ? 'bg-slate-500/10 text-slate-500' 
                      : 'bg-amber-500/10 text-amber-500'
                  }`}
                >
                  {selectedSlip.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                
                {selectedSlip.status === 'Draft' && !editMode && (
                  <button
                    onClick={handleOpenEditMode}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-2xl transition-all"
                  >
                    <Edit3 size={13} />
                    <span>Edit Slip</span>
                  </button>
                )}

                {selectedSlip.status === 'Draft' && !editMode && (
                  <button
                    onClick={() => handlePublishSlip(selectedSlip._id)}
                    className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-650 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-sm"
                  >
                    <Check size={13} />
                    <span>Publish Slip</span>
                  </button>
                )}

                {!editMode && (
                  <>
                    <button
                      onClick={handlePrintSlip}
                      className="flex items-center gap-1 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-2xl text-xs font-bold text-slate-500"
                    >
                      <Printer size={13} />
                    </button>
                    
                    <button
                      onClick={() => handleDownloadPDFSlip(selectedSlip._id, selectedSlip.employeeId?.name || 'Employee', selectedSlip.month, selectedSlip.year)}
                      className="flex items-center gap-1 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-2xl text-xs font-bold text-slate-500"
                    >
                      <Download size={13} />
                    </button>

                    {selectedSlip.status === 'Published' && (
                      <button
                        onClick={() => handleEmailSlip(selectedSlip._id, selectedSlip.employeeId?.name)}
                        className="flex items-center gap-1 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-650 hover:text-white rounded-2xl text-xs font-bold text-indigo-500 transition-colors"
                      >
                        <Mail size={13} />
                      </button>
                    )}

                    {selectedSlip.status === 'Draft' && (
                      <button
                        onClick={() => handleDeleteSlip(selectedSlip._id)}
                        className="flex items-center gap-1 px-3.5 py-2 border border-rose-200 hover:bg-rose-50 rounded-2xl text-xs font-bold text-rose-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </>
                )}

                <button onClick={() => setShowViewModal(false)} className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="p-8 overflow-y-auto max-h-[70vh] bg-slate-50 dark:bg-slate-950/20">
              
              {editError && (
                <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-2.5 text-xs font-semibold">
                  <AlertCircle size={15} />
                  <span>{editError}</span>
                </div>
              )}

              {editMode ? (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
                    <h4 className="text-xs font-black text-[#0B1F4B] dark:text-[#4DB848] uppercase tracking-wider border-b pb-2">Edit Mode - {selectedSlip.employeeId?.name}</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      
                      {/* Attendance columns */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Working Days</label>
                        <input
                          type="number"
                          value={editForm.workingDays}
                          onChange={(e) => setEditForm(prev => ({ ...prev, workingDays: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Days Worked</label>
                        <input
                          type="number"
                          value={editForm.daysWorked}
                          onChange={(e) => setEditForm(prev => ({ ...prev, daysWorked: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                        />
                      </div>

                      {/* Earnings */}
                      <div className="col-span-2 grid grid-cols-2 gap-3 p-4 border rounded-2xl bg-slate-50/50 dark:bg-slate-950/10">
                        <h5 className="col-span-2 text-[10px] font-black uppercase text-[#0B1F4B] dark:text-[#4DB848]">Earnings</h5>
                        
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Basic Salary</label>
                          <input
                            type="number"
                            value={editForm.basicSalary}
                            onChange={(e) => setEditForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">House Rent Allowance</label>
                          <input
                            type="number"
                            value={editForm.houseRentAllowance}
                            onChange={(e) => setEditForm(prev => ({ ...prev, houseRentAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Special Allowance</label>
                          <input
                            type="number"
                            value={editForm.specialAllowance}
                            onChange={(e) => setEditForm(prev => ({ ...prev, specialAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Transport Allowance</label>
                          <input
                            type="number"
                            value={editForm.transportAllowance}
                            onChange={(e) => setEditForm(prev => ({ ...prev, transportAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Other Allowance</label>
                          <input
                            type="number"
                            value={editForm.otherAllowance}
                            onChange={(e) => setEditForm(prev => ({ ...prev, otherAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Integrity Award</label>
                          <input
                            type="number"
                            value={editForm.kodbrandIntegrityAward}
                            onChange={(e) => setEditForm(prev => ({ ...prev, kodbrandIntegrityAward: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                      </div>

                      {/* Deductions */}
                      <div className="col-span-2 grid grid-cols-2 gap-3 p-4 border rounded-2xl bg-slate-50/50 dark:bg-slate-950/10">
                        <h5 className="col-span-2 text-[10px] font-black uppercase text-rose-500">Deductions</h5>
                        
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Advance Salary</label>
                          <input
                            type="number"
                            value={editForm.advanceSalary}
                            onChange={(e) => setEditForm(prev => ({ ...prev, advanceSalary: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Provident Fund (PF)</label>
                          <input
                            type="number"
                            value={editForm.providentFund}
                            onChange={(e) => setEditForm(prev => ({ ...prev, providentFund: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Professional Tax</label>
                          <input
                            type="number"
                            value={editForm.professionalTax}
                            onChange={(e) => setEditForm(prev => ({ ...prev, professionalTax: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Income Tax</label>
                          <input
                            type="number"
                            value={editForm.incomeTax}
                            onChange={(e) => setEditForm(prev => ({ ...prev, incomeTax: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Unpaid Leave Deduction</label>
                          <input
                            type="number"
                            value={editForm.unpaidLeaveDeduction}
                            onChange={(e) => setEditForm(prev => ({ ...prev, unpaidLeaveDeduction: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Other Deductions</label>
                          <input
                            type="number"
                            value={editForm.otherDeductions}
                            onChange={(e) => setEditForm(prev => ({ ...prev, otherDeductions: Number(e.target.value) }))}
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Remarks</label>
                        <textarea
                          value={editForm.remarks}
                          onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 text-xs"
                        />
                      </div>

                    </div>
                  </div>

                  <div className="p-4 border-2 border-[#4DB848]/45 bg-[#4DB848]/5 rounded-2xl flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-[#0B1F4B] tracking-wide">Recalculated Net Pay</span>
                    <span className="text-base font-mono font-black text-[#4DB848]">₹{editTotals.netPay.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 border rounded-xl text-slate-500 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-[#0B1F4B] hover:bg-[#0B1F4B]/95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div 
                  id="hr-salary-slip-printable"
                  className="bg-white text-slate-900 p-6 border border-slate-200 rounded-xl space-y-6 text-xs max-w-2xl mx-auto shadow-md"
                >
                  
                  {/* Slip Header */}
                  <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <div className="space-y-0.5">
                      <div className="text-xl font-bold tracking-tight">
                        <span className="text-[#4DB848]">KOD.</span>
                        <span className="text-[#0B1F4B]">brand</span>
                      </div>
                      <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider block">Digital Marketing Solutions Pvt Ltd</span>
                    </div>
                    <div className="bg-[#0B1F4B] text-white p-2.5 rounded-lg flex flex-col items-center justify-center text-center w-40">
                      <span className="text-[11px] font-extrabold tracking-widest block text-white">PAYSLIP</span>
                      <span className="text-[6.5px] font-semibold text-slate-350 block tracking-wider mt-0.5 font-mono">FOR THE MONTH OF</span>
                      <span className="text-[#4DB848] text-[9.5px] font-extrabold block tracking-wide uppercase mt-0.5">
                        {MONTHS[selectedSlip.month - 1]} {selectedSlip.year}
                      </span>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    {/* Left Column: Employee Details */}
                    <div>
                      <h4 className="text-[9px] font-extrabold text-[#0B1F4B] border-b border-slate-205 pb-1 uppercase tracking-wider">Employee Details</h4>
                      <table className="w-full text-left mt-2 border-collapse text-[10px]">
                        <tbody>
                          <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold w-1/3">Employee ID</td><td className="py-1 text-slate-800 font-bold">{selectedSlip.employeeId?.employeeId || 'N/A'}</td></tr>
                          <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Employee Name</td><td className="py-1 text-slate-800 font-bold">{selectedSlip.employeeId?.name || 'N/A'}</td></tr>
                          <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Department</td><td className="py-1 text-slate-800 font-semibold">{selectedSlip.employeeId?.department || 'N/A'}</td></tr>
                          <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Designation</td><td className="py-1 text-slate-800 font-semibold">{selectedSlip.employeeId?.designationId?.name || selectedSlip.employeeId?.designation || 'Staff'}</td></tr>
                          <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Location</td><td className="py-1 text-slate-800 font-semibold">{selectedSlip.location || 'Malappuram'}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Right Column: Pay Period Details */}
                    <div>
                      <h4 className="text-[9px] font-extrabold text-[#0B1F4B] border-b border-slate-205 pb-1 uppercase tracking-wider">Pay Period Details</h4>
                      <table className="w-full text-left mt-2 border-collapse text-[10px]">
                        <tbody>
                          <tr className="border-b border-slate-50">
                            <td className="py-1 text-slate-400 font-semibold w-1/3">Pay Period</td>
                            <td className="py-1 text-slate-800 font-semibold">
                              {(() => {
                                const lastDay = new Date(selectedSlip.year, selectedSlip.month, 0).getDate();
                                const mName = MONTHS[selectedSlip.month - 1];
                                return `${mName} 1 – ${mName} ${lastDay}, ${selectedSlip.year}`;
                              })()}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-50">
                            <td className="py-1 text-slate-400 font-semibold">Pay Date</td>
                            <td className="py-1 text-slate-800 font-semibold">
                              {selectedSlip.publishedDate 
                                ? new Date(selectedSlip.publishedDate).toLocaleDateString('en-IN') 
                                : (selectedSlip.createdAt ? new Date(selectedSlip.createdAt).toLocaleDateString('en-IN') : 'PENDING')}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Working Days</td><td className="py-1 text-slate-800 font-semibold">{selectedSlip.workingDays ?? 26}</td></tr>
                          <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Days Worked</td><td className="py-1 text-slate-800 font-semibold">{selectedSlip.daysWorked ?? 26}</td></tr>
                          <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Days on Leave</td><td className="py-1 text-slate-800 font-semibold">{selectedSlip.daysOnLeave ?? 0}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Earnings & Deductions Tables */}
                  <div className="grid grid-cols-2 gap-6 pt-2 items-start">
                    
                    {/* Earnings Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-[#0B1F4B] text-white text-[9px] uppercase tracking-wider font-bold">
                            <th className="p-2">Particulars</th>
                            <th className="p-2 text-right">Amount (INR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          <tr><td className="p-2 font-medium">Basic Salary</td><td className="p-2 text-right font-mono">₹{(selectedSlip.basicSalary || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">House Rent Allowance</td><td className="p-2 text-right font-mono">₹{(selectedSlip.houseRentAllowance || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">Special Allowance</td><td className="p-2 text-right font-mono">₹{(selectedSlip.specialAllowance || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">Transport Allowance</td><td className="p-2 text-right font-mono">₹{(selectedSlip.transportAllowance || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">Other Allowance</td><td className="p-2 text-right font-mono">₹{(selectedSlip.otherAllowance || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium text-[#4DB848]">Kodbrand Integrity Award</td><td className="p-2 text-right font-mono text-[#4DB848] font-bold">₹{(selectedSlip.kodbrandIntegrityAward || 0).toFixed(2)}</td></tr>
                          <tr className="bg-[#F5F2E8] text-[#4DB848] font-bold">
                            <td className="p-2">TOTAL EARNINGS</td>
                            <td className="p-2 text-right font-mono">₹{(selectedSlip.totalEarnings || 0).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Deductions Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-[#0B1F4B] text-white text-[9px] uppercase tracking-wider font-bold">
                            <th className="p-2">Particulars</th>
                            <th className="p-2 text-right">Amount (INR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          <tr><td className="p-2 font-medium">Advance Salary</td><td className="p-2 text-right font-mono">₹{(selectedSlip.advanceSalary || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">Provident Fund (PF)</td><td className="p-2 text-right font-mono">₹{(selectedSlip.providentFund || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">Professional Tax</td><td className="p-2 text-right font-mono">₹{(selectedSlip.professionalTax || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">Income Tax (TDS)</td><td className="p-2 text-right font-mono">₹{(selectedSlip.incomeTax || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">Unpaid Leave Deduction</td><td className="p-2 text-right font-mono">₹{(selectedSlip.unpaidLeaveDeduction || 0).toFixed(2)}</td></tr>
                          <tr><td className="p-2 font-medium">Other Deductions</td><td className="p-2 text-right font-mono">₹{(selectedSlip.otherDeductions || 0).toFixed(2)}</td></tr>
                          <tr className="bg-[#F5F2E8] text-[#4DB848] font-bold">
                            <td className="p-2">TOTAL DEDUCTIONS</td>
                            <td className="p-2 text-right font-mono">₹{(selectedSlip.totalDeductions || 0).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Net Pay Box */}
                  <div className="border-2 border-[#0B1F4B] rounded-lg p-3.5 flex justify-between items-center bg-slate-50/50">
                    <span className="font-extrabold text-[#0B1F4B] text-xs">NET PAY (₹)</span>
                    <span className="font-extrabold text-[#0B1F4B] text-sm font-mono">
                      ₹{(selectedSlip.netPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Remarks/Notes */}
                  {selectedSlip.remarks && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-[10px] text-slate-500 leading-normal">
                      <span className="font-black uppercase text-[#0B1F4B] block mb-1">Remarks / Remarks:</span>
                      <span>{selectedSlip.remarks}</span>
                    </div>
                  )}

                  {/* Footer Section */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-[9px] text-slate-500">
                    {/* Left address */}
                    <div className="space-y-0.5 leading-relaxed">
                      <span className="font-bold text-[#0B1F4B] text-[9.5px] block">KODBRAND SOLUTIONS</span>
                      <span>3rd Floor, Aranyakam Building, Thamarakuzhi Road,</span>
                      <span>Malappuram, Kerala - 676505</span>
                      <span className="block">Building No: 14/319</span>
                      <span className="block">info@kodbrand.com | www.kodbrand.com</span>
                      <span className="block font-semibold">CIN: U72900KA2024PTC123456</span>
                    </div>

                    {/* Centre Thank You */}
                    <div className="text-center flex flex-col items-center justify-center space-y-1">
                      <span className="font-extrabold text-[#4DB848] text-xs block">Thank You</span>
                      <span className="font-semibold italic text-[#4DB848] text-[9px] block font-serif">For Your Contribution</span>
                      <span className="text-[7.5px] text-slate-400 block max-w-44 leading-tight mt-1">Your dedication and hard work drive our success.</span>
                    </div>

                    {/* Right signatory */}
                    <div className="text-center flex flex-col items-center justify-end space-y-5 h-full">
                      <div className="w-28 border-b border-slate-300 h-8"></div>
                      <div className="space-y-0.5 text-[8.5px]">
                        <span className="font-bold text-slate-700 block leading-none">Authorised Signatory</span>
                        <span className="font-semibold text-[#0B1F4B] block uppercase leading-none">KODBRAND SOLUTIONS</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar Taglines */}
                  <div className="bg-[#0B1F4B] text-white px-3 py-1.5 rounded-md flex justify-between items-center text-[7.5px] mt-2">
                    <span>We value your efforts and look forward to achieving greater success together.</span>
                    <span className="font-semibold flex items-center gap-0.5">
                      Building Brands. Driving Growth. ★
                    </span>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default SalarySlipsHRPage;
