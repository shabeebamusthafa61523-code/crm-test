import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Eye,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Coins,
  ShieldAlert,
  Users
} from 'lucide-react';
import { 
  getSalaries, 
  createSalary, 
  updateSalary, 
  deleteSalary, 
  updateSalaryWorkflow, 
  batchGenerateDrafts,
  emailSalarySlip
} from '../../services/payrollService';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const SalaryManagement = () => {
  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [showFilters, setShowFilters] = useState(false);

  // Modals / Overlays
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [toast, setToast] = useState(null);

  // Add Form persistent fields
  const [addFormFields, setAddFormFields] = useState({
    employeeId: '',
    salaryMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
    basicSalary: '',
    hra: 0,
    travelAllowance: 0,
    specialAllowance: 0,
    otherAllowance: 0,
    bonus: 0,
    incentive: 0,
    integrityAward: 0,
    advanceSalary: 0,
    pf: 0,
    professionalTax: 0,
    incomeTax: 0, // TDS
    unpaidLeave: 0,
    otherDeductions: 0,
    workingDays: 30,
    daysWorked: 30,
    daysOnLeave: 0,
    location: 'Malappuram',
    status: 'Draft'
  });

  // Edit Form Fields
  const [formFields, setFormFields] = useState({
    employeeId: '',
    salaryMonth: '',
    basicSalary: '',
    hra: 0,
    travelAllowance: 0,
    specialAllowance: 0,
    otherAllowance: 0,
    bonus: 0,
    incentive: 0,
    integrityAward: 0,
    advanceSalary: 0,
    pf: 0,
    professionalTax: 0,
    incomeTax: 0,
    unpaidLeave: 0,
    otherDeductions: 0,
    workingDays: 30,
    daysWorked: 30,
    daysOnLeave: 0,
    location: 'Malappuram',
    status: 'Draft'
  });

  // Disbursement/Pay Form fields
  const [payFields, setPayFields] = useState({
    paymentMethod: 'Bank Transfer',
    paidDate: ''
  });

  const [formError, setFormError] = useState('');
  const [editFormError, setEditFormError] = useState('');

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/users/list`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEmployees(data.data);
      } else if (Array.isArray(data)) {
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to load employee list:', err);
    }
  };

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        status,
        employeeId,
        salaryMonth: salaryMonth ? `${salaryMonth}-01` : undefined
      };
      const res = await getSalaries(params);
      if (res.success) {
        setSalaries(res.data.salaries || []);
      }
    } catch (err) {
      console.error('Failed to retrieve salaries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      
      const role = String(u.role_id || u.roleId || u.role || '').toLowerCase().trim();
      const adminOrHR = ['1', '2', 'hr', 'admin'].includes(role);
      
      let designationId = '';
      if (u.designationId) {
        designationId = typeof u.designationId === 'object' ? u.designationId._id : u.designationId;
      } else if (u.designation_id) {
        designationId = u.designation_id;
      }
      
      const hrDesignation = ['1', '6a2f8efea2fe388770a38987'].includes(String(designationId).trim());
      setIsAuthorized(adminOrHR || hrDesignation);
    }
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchSalaries();
    }
  }, [isAuthorized, search, status, employeeId, salaryMonth]);

  const showToastMsg = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setEmployeeId('');
    setSalaryMonth(new Date().toISOString().slice(0, 7));
  };

  const handleOpenEditModal = (record) => {
    setCurrentRecord(record);
    const dateObj = new Date(record.salaryMonth);
    const monthStr = record.salaryMonth ? dateObj.toISOString().slice(0, 7) : '';
    setFormFields({
      employeeId: record.employeeId?._id || record.employeeId || '',
      salaryMonth: monthStr,
      basicSalary: record.basicSalary || '',
      hra: record.hra || 0,
      travelAllowance: record.travelAllowance || 0,
      specialAllowance: record.specialAllowance || 0,
      otherAllowance: record.otherAllowance || 0,
      bonus: record.bonus || 0,
      incentive: record.incentive || 0,
      integrityAward: record.integrityAward || 0,
      advanceSalary: record.advanceSalary || 0,
      pf: record.pf || 0,
      professionalTax: record.professionalTax || 0,
      incomeTax: record.incomeTax || 0,
      unpaidLeave: record.unpaidLeave || 0,
      otherDeductions: record.otherDeductions || 0,
      workingDays: record.workingDays ?? 30,
      daysWorked: record.daysWorked ?? 30,
      daysOnLeave: record.daysOnLeave ?? 0,
      location: record.location || 'Malappuram',
      status: record.status
    });
    setEditFormError('');
    setShowEditModal(true);
  };

  // Live auto-calculation for Add form
  const addFormTotals = useMemo(() => {
    const basic = parseFloat(addFormFields.basicSalary) || 0;
    const earnings = basic + 
      (parseFloat(addFormFields.hra) || 0) + 
      (parseFloat(addFormFields.travelAllowance) || 0) + 
      (parseFloat(addFormFields.specialAllowance) || 0) + 
      (parseFloat(addFormFields.otherAllowance) || 0) + 
      (parseFloat(addFormFields.bonus) || 0) + 
      (parseFloat(addFormFields.incentive) || 0) +
      (parseFloat(addFormFields.integrityAward) || 0);

    const deductions = 
      (parseFloat(addFormFields.advanceSalary) || 0) + 
      (parseFloat(addFormFields.pf) || 0) + 
      (parseFloat(addFormFields.professionalTax) || 0) + 
      (parseFloat(addFormFields.incomeTax) || 0) + 
      (parseFloat(addFormFields.unpaidLeave) || 0) + 
      (parseFloat(addFormFields.otherDeductions) || 0);

    return {
      earnings: Number(earnings.toFixed(2)),
      deductions: Number(deductions.toFixed(2)),
      netSalary: Number((earnings - deductions).toFixed(2))
    };
  }, [addFormFields]);

  // Live auto-calculation for Edit Form
  const editFormTotals = useMemo(() => {
    const basic = parseFloat(formFields.basicSalary) || 0;
    const earnings = basic + 
      (parseFloat(formFields.hra) || 0) + 
      (parseFloat(formFields.travelAllowance) || 0) + 
      (parseFloat(formFields.specialAllowance) || 0) + 
      (parseFloat(formFields.otherAllowance) || 0) + 
      (parseFloat(formFields.bonus) || 0) + 
      (parseFloat(formFields.incentive) || 0) +
      (parseFloat(formFields.integrityAward) || 0);

    const deductions = 
      (parseFloat(formFields.advanceSalary) || 0) + 
      (parseFloat(formFields.pf) || 0) + 
      (parseFloat(formFields.professionalTax) || 0) + 
      (parseFloat(formFields.incomeTax) || 0) + 
      (parseFloat(formFields.unpaidLeave) || 0) + 
      (parseFloat(formFields.otherDeductions) || 0);

    return {
      earnings: Number(earnings.toFixed(2)),
      deductions: Number(deductions.toFixed(2)),
      netSalary: Number((earnings - deductions).toFixed(2))
    };
  }, [formFields]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!addFormFields.employeeId) {
      setFormError('Please select an employee');
      return;
    }
    if (!addFormFields.basicSalary || parseFloat(addFormFields.basicSalary) <= 0) {
      setFormError('Please enter a valid basic salary');
      return;
    }

    try {
      const monthDate = new Date(`${addFormFields.salaryMonth}-01`);
      
      const payload = {
        ...addFormFields,
        basicSalary: Number(addFormFields.basicSalary),
        salaryMonth: monthDate
      };
      
      const res = await createSalary(payload);
      if (res.success) {
        showToastMsg('Salary slip generated successfully');
        setAddFormFields({
          employeeId: '',
          salaryMonth: new Date().toISOString().slice(0, 7),
          basicSalary: '',
          hra: 0,
          travelAllowance: 0,
          specialAllowance: 0,
          otherAllowance: 0,
          bonus: 0,
          incentive: 0,
          integrityAward: 0,
          advanceSalary: 0,
          pf: 0,
          professionalTax: 0,
          incomeTax: 0,
          unpaidLeave: 0,
          otherDeductions: 0,
          workingDays: 30,
          daysWorked: 30,
          daysOnLeave: 0,
          location: 'Malappuram',
          status: 'Draft'
        });
        fetchSalaries();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditFormError('');
    if (!formFields.employeeId) {
      setEditFormError('Please select an employee');
      return;
    }

    try {
      const monthDate = new Date(`${formFields.salaryMonth}-01`);
      
      const payload = {
        ...formFields,
        basicSalary: Number(formFields.basicSalary),
        salaryMonth: monthDate
      };
      
      const res = await updateSalary(currentRecord._id, payload);
      if (res.success) {
        showToastMsg('Salary details updated successfully');
        setShowEditModal(false);
        fetchSalaries();
      }
    } catch (err) {
      setEditFormError(err.message || 'Operation failed');
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salary record?')) return;
    try {
      const res = await deleteSalary(id);
      if (res.success) {
        showToastMsg('Salary sheet deleted');
        fetchSalaries();
      }
    } catch (err) {
      showToastMsg(err.message || 'Deletion failed', 'error');
    }
  };

  const handleBatchGenerate = async () => {
    if (!salaryMonth) {
      showToastMsg('Please select a target month first', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to generate automated payroll drafts for ${salaryMonth}?`)) return;

    try {
      setLoading(true);
      const res = await batchGenerateDrafts(`${salaryMonth}-01`);
      if (res.success) {
        showToastMsg(`Batch process completed! Generated drafts for employees.`);
        fetchSalaries();
      }
    } catch (err) {
      showToastMsg(err.message || 'Batch generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowTransition = async (id, statusVal) => {
    if (statusVal === 'Paid') {
      const rec = salaries.find(s => s._id === id);
      setCurrentRecord(rec);
      setPayFields({
        paymentMethod: 'Bank Transfer',
        paidDate: new Date().toISOString().split('T')[0]
      });
      setFormError('');
      setShowPayModal(true);
      return;
    }

    if (!window.confirm(`Transition payroll record to ${statusVal}?`)) return;
    try {
      const res = await updateSalaryWorkflow(id, { status: statusVal });
      if (res.success) {
        showToastMsg(`Payroll record marked as ${statusVal}`);
        fetchSalaries();
      }
    } catch (err) {
      showToastMsg(err.message || 'Workflow transition failed', 'error');
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payFields.paidDate) {
      setFormError('Please enter payment disbursement date');
      return;
    }
    try {
      const res = await updateSalaryWorkflow(currentRecord._id, {
        status: 'Paid',
        paymentMethod: payFields.paymentMethod,
        paidDate: payFields.paidDate
      });
      if (res.success) {
        showToastMsg('Salary disbursed and accounting entry synchronized!');
        setShowPayModal(false);
        fetchSalaries();
      }
    } catch (err) {
      setFormError(err.message || 'Disbursement recording failed');
    }
  };

  const handleEmailSlip = async (id, name) => {
    try {
      showToastMsg(`Emailing salary slip to ${name}...`);
      const res = await emailSalarySlip(id);
      if (res.success) {
        showToastMsg(`Salary slip dispatched to ${name} successfully!`);
      }
    } catch (err) {
      showToastMsg(err.message || 'Failed to send email slip', 'error');
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'Employee Name', 'Salary Month', 'Basic Salary (₹)', 'Total Earnings (₹)', 
      'Total Deductions (₹)', 'Net Salary Paid (₹)', 'Workflow Status', 'Payment Method', 'Disbursed Date', 'Salary Slip #'
    ];
    const data = salaries.map(s => {
      const empName = s.employeeId?.name || 'N/A';
      const mStr = s.salaryMonth ? new Date(s.salaryMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'N/A';
      return [
        empName,
        mStr,
        s.basicSalary,
        s.totalEarnings,
        s.totalDeductions,
        s.netSalary,
        s.status,
        s.paymentMethod || 'N/A',
        s.paidDate ? new Date(s.paidDate).toLocaleDateString('en-IN') : 'N/A',
        s.salarySlipNumber || 'N/A'
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Ledger');
    XLSX.writeFile(workbook, `Salary_Payroll_Ledger_${salaryMonth || 'YTD'}.xlsx`);
    showToastMsg('Salary ledger exported to Excel');
  };

  const getEmployeeName = (emp) => {
    if (!emp) return 'N/A';
    return emp.name || 'N/A';
  };

  // Enforce access control guard
  if (user && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/50 backdrop-blur-md rounded-[2.5rem]">
        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full mb-4">
          <ShieldAlert size={40} />
        </div>
        <h3 className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
          Access Restricted
        </h3>
        <p className="text-slate-400 text-xs mt-2 max-w-sm">
          This payroll module is accessible strictly to HR Managers and Administrators.
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border text-[11px] font-black uppercase tracking-wider
              ${toast.type === 'error' 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Premium Add Salary Slip Form */}
        <div className="lg:col-span-5 bg-white/20 dark:bg-slate-900/30 border border-white/20 dark:border-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              <span>Generate Salary Slip</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Assign allowances and generate employee payroll slips</p>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-5">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            {/* Core Info */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Employee Select *</label>
                <select
                  required
                  value={addFormFields.employeeId}
                  onChange={(e) => setAddFormFields(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Month / Year *</label>
                  <input
                    type="month"
                    required
                    value={addFormFields.salaryMonth}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, salaryMonth: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Base Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={addFormFields.basicSalary}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, basicSalary: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Allowances & Earnings */}
            <div className="border border-white/10 dark:border-slate-800/60 rounded-2xl p-4 space-y-3 bg-white/5 dark:bg-slate-950/20">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 block border-b border-white/10 dark:border-slate-800/40 pb-1.5">
                Allowances & Earnings
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-1">
                  <label className="text-slate-400">HRA Allowance</label>
                  <input
                    type="number"
                    value={addFormFields.hra}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, hra: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450">Travel Allowance</label>
                  <input
                    type="number"
                    value={addFormFields.travelAllowance}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, travelAllowance: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450">Special Allowance</label>
                  <input
                    type="number"
                    value={addFormFields.specialAllowance}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, specialAllowance: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450">Incentives</label>
                  <input
                    type="number"
                    value={addFormFields.incentive}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, incentive: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450">Bonus</label>
                  <input
                    type="number"
                    value={addFormFields.bonus}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, bonus: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450">Other Allowance</label>
                  <input
                    type="number"
                    value={addFormFields.otherAllowance}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, otherAllowance: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-white/10 dark:border-slate-800/60 rounded-2xl p-4 space-y-3 bg-white/5 dark:bg-slate-950/20">
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 block border-b border-white/10 dark:border-slate-800/40 pb-1.5">
                Deductions & Tax LOPs
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-1">
                  <label className="text-slate-450">PF Contribution</label>
                  <input
                    type="number"
                    value={addFormFields.pf}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, pf: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-455">Professional Tax</label>
                  <input
                    type="number"
                    value={addFormFields.professionalTax}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, professionalTax: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-455">Income Tax (TDS)</label>
                  <input
                    type="number"
                    value={addFormFields.incomeTax}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, incomeTax: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-455">Advance Repay</label>
                  <input
                    type="number"
                    value={addFormFields.advanceSalary}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, advanceSalary: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-455">Unpaid Leaves LOP</label>
                  <input
                    type="number"
                    value={addFormFields.unpaidLeave}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, unpaidLeave: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-455">Other Deduct</label>
                  <input
                    type="number"
                    value={addFormFields.otherDeductions}
                    onChange={(e) => setAddFormFields(prev => ({ ...prev, otherDeductions: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Calculations metrics card */}
            <div className="bg-slate-950/40 border border-white/10 dark:border-slate-800/80 rounded-2xl p-4 grid grid-cols-3 text-center gap-1">
              <div>
                <span className="text-[8px] text-slate-450 block font-black uppercase tracking-tight">Earnings</span>
                <span className="text-xs font-bold text-emerald-500 font-mono">₹{addFormTotals.earnings.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-450 block font-black uppercase tracking-tight">Deductions</span>
                <span className="text-xs font-bold text-rose-500 font-mono">₹{addFormTotals.deductions.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-450 block font-black uppercase tracking-tight">Net Payable</span>
                <span className="text-xs font-black text-white font-mono block truncate">₹{addFormTotals.netSalary.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Submit Action Button with Lift Transition */}
            <motion.button
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-650 to-indigo-700 hover:from-indigo-600 hover:to-indigo-750 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/10 cursor-pointer transition-all"
            >
              Generate Slip
            </motion.button>

          </form>
        </div>

        {/* RIGHT COLUMN: Search Filters, Stats, and Recent Slips Ledger */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SEARCH AND FILTERS BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/20 dark:bg-slate-900/30 border border-white/20 dark:border-slate-850/50 backdrop-blur-md p-4 rounded-[2rem] shadow-lg">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="month"
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs w-40 focus:outline-none"
                />
              </div>

              <button
                onClick={handleBatchGenerate}
                className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/5 text-indigo-500 hover:bg-indigo-50 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                title="Automatically generate drafts for all employees for selected month"
              >
                <Coins size={12} />
                <span>Auto Drafts</span>
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-xl border transition-all flex items-center gap-1 text-[10px] font-bold
                  ${showFilters 
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'
                  }`}
              >
                <Filter size={12} />
                <span>Filters</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-300 text-[10px] font-semibold rounded-xl"
              >
                <FileSpreadsheet size={12} />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE FILTERS PANEL */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850/50 p-4 rounded-3xl grid grid-cols-1 sm:grid-cols-3 gap-4 backdrop-blur-md">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Employee</label>
                    <select
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                    >
                      <option value="">All Employees</option>
                      {employees.map(e => (
                        <option key={e._id} value={e._id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Workflow Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="Draft">Draft</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Approved">Approved</option>
                      <option value="Paid">Paid (Disbursed)</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 flex items-end">
                    <button 
                      onClick={handleResetFilters}
                      className="w-full py-2 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs font-bold"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PAYROLL SALARIES DATABASE TABLE */}
          <div className="bg-white/20 dark:bg-slate-900/30 border border-white/20 dark:border-slate-850/50 backdrop-blur-md rounded-[2rem] shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 dark:border-slate-800/40 text-slate-400 text-[9px] font-black uppercase tracking-wider bg-white/5 dark:bg-slate-950/20">
                    <th className="py-3.5 px-5">Employee</th>
                    <th className="py-3.5 px-5">Month</th>
                    <th className="py-3.5 px-5 text-right font-bold">Basic (₹)</th>
                    <th className="py-3.5 px-5 text-right text-emerald-500">Gross (₹)</th>
                    <th className="py-3.5 px-5 text-right text-rose-500">Deduct (₹)</th>
                    <th className="py-3.5 px-5 text-right font-black">Net Pay (₹)</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <div className="flex justify-center items-center gap-2">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-indigo-650 border-t-transparent rounded-full"
                          />
                          <span>Retrieving salary roll lists...</span>
                        </div>
                      </td>
                    </tr>
                  ) : salaries.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        No payroll entries found for filters.
                      </td>
                    </tr>
                  ) : (
                    salaries.map((sal) => {
                      const statusColors = {
                        Draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                        Submitted: 'bg-indigo-500/10 text-indigo-550 border-indigo-500/20',
                        Approved: 'bg-amber-500/10 text-amber-550 border-amber-500/20',
                        Paid: 'bg-emerald-500/10 text-emerald-550 border-emerald-500/20',
                        Rejected: 'bg-rose-500/10 text-rose-555 border-rose-500/20'
                      };

                      return (
                        <tr key={sal._id} className="hover:bg-white/5 dark:hover:bg-slate-800/20 transition-all">
                          <td className="py-3 px-5">
                            <div className="font-bold text-slate-900 dark:text-white">{getEmployeeName(sal.employeeId)}</div>
                            <span className="text-[8px] text-indigo-450 block font-mono mt-0.5">{sal.salarySlipNumber || 'DRAFT-SLIP'}</span>
                          </td>
                          <td className="py-3 px-5 font-semibold text-slate-505">
                            {new Date(sal.salaryMonth).toLocaleString('default', { month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-5 text-right font-mono">
                            {Number(sal.basicSalary || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-5 text-right font-mono text-emerald-500">
                            +{Number(sal.totalEarnings || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-5 text-right font-mono text-rose-550">
                            -{Number(sal.totalDeductions || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-5 text-right font-black text-slate-900 dark:text-white font-mono">
                            {Number(sal.netSalary || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${statusColors[sal.status] || ''}`}>
                              {sal.status}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex items-center justify-center gap-1">
                              
                              {/* HR WORKFLOW ACTION TRANSITIONS */}
                              {sal.status === 'Draft' && (
                                <button
                                  onClick={() => handleWorkflowTransition(sal._id, 'Submitted')}
                                  className="px-1.5 py-0.5 bg-indigo-600/10 hover:bg-indigo-650 text-indigo-500 hover:text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all"
                                >
                                  Submit
                                </button>
                              )}

                              {sal.status === 'Submitted' && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleWorkflowTransition(sal._id, 'Approved')}
                                    className="px-1.5 py-0.5 bg-emerald-600/10 hover:bg-emerald-605 text-emerald-500 hover:text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleWorkflowTransition(sal._id, 'Rejected')}
                                    className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-505 text-rose-500 hover:text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}

                              {sal.status === 'Approved' && (
                                <button
                                  onClick={() => handleWorkflowTransition(sal._id, 'Paid')}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm"
                                >
                                  Disburse
                                </button>
                              )}

                              {sal.status === 'Paid' && (
                                <button
                                  onClick={() => handleEmailSlip(sal._id, getEmployeeName(sal.employeeId))}
                                  className="px-1.5 py-0.5 border border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all"
                                >
                                  Email
                                </button>
                              )}

                              {/* CRUD OPTIONS */}
                              {sal.status !== 'Paid' && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditModal(sal)}
                                    title="Edit values"
                                    className="p-1 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                  >
                                    <Edit3 size={10} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(sal._id)}
                                    title="Delete record"
                                    className="p-1 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-rose-500/10 text-rose-555 transition-colors"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* EDIT SALARY SLIP MODAL OVERLAY */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-955/70 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-4xl bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-200/60 dark:border-slate-800/60">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Edit Salary Sheet</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Update employee allowances and tax figures</span>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                {editFormError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{editFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-405 font-bold">Employee</label>
                    <select
                      disabled
                      value={formFields.employeeId}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-100 dark:bg-slate-955 text-slate-400 text-xs cursor-not-allowed"
                    >
                      {employees.map(e => (
                        <option key={e._id} value={e._id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-405 font-bold">Salary Month</label>
                    <input
                      type="text"
                      disabled
                      value={formFields.salaryMonth ? new Date(`${formFields.salaryMonth}-01`).toLocaleString('default', { month: 'long', year: 'numeric' }) : ''}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-slate-100 dark:bg-slate-955 text-slate-400 text-xs cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-405 font-bold font-mono">Basic Salary (₹)</label>
                    <input
                      type="number"
                      required
                      value={formFields.basicSalary}
                      onChange={(e) => setFormFields(prev => ({ ...prev, basicSalary: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-405 font-bold">Location</label>
                    <input
                      type="text"
                      value={formFields.location}
                      onChange={(e) => setFormFields(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-405 font-bold">Working Days</label>
                    <input
                      type="number"
                      value={formFields.workingDays}
                      onChange={(e) => setFormFields(prev => ({ ...prev, workingDays: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-405 font-bold">Days Worked</label>
                    <input
                      type="number"
                      value={formFields.daysWorked}
                      onChange={(e) => setFormFields(prev => ({ ...prev, daysWorked: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-405 font-bold">Days on Leave</label>
                    <input
                      type="number"
                      value={formFields.daysOnLeave}
                      onChange={(e) => setFormFields(prev => ({ ...prev, daysOnLeave: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Allowances */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-white/5 dark:bg-slate-955/20">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 block border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                      Allowances & Earnings (Additions)
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="space-y-1">
                        <label className="text-slate-450 font-bold">House Rent Allowance</label>
                        <input
                          type="number"
                          value={formFields.hra}
                          onChange={(e) => setFormFields(prev => ({ ...prev, hra: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-450 font-bold">Special Allowance</label>
                        <input
                          type="number"
                          value={formFields.specialAllowance}
                          onChange={(e) => setFormFields(prev => ({ ...prev, specialAllowance: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-450 font-bold">Transport Allowance</label>
                        <input
                          type="number"
                          value={formFields.travelAllowance}
                          onChange={(e) => setFormFields(prev => ({ ...prev, travelAllowance: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-455 font-bold">Other Allowance</label>
                        <input
                          type="number"
                          value={formFields.otherAllowance}
                          onChange={(e) => setFormFields(prev => ({ ...prev, otherAllowance: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-slate-450 font-bold">Kodbrand Integrity Award</label>
                        <input
                          type="number"
                          value={formFields.integrityAward}
                          onChange={(e) => setFormFields(prev => ({ ...prev, integrityAward: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-white/5 dark:bg-slate-955/20">
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 block border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                      Withholdings & Deductions (Subtractions)
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="space-y-1">
                        <label className="text-slate-455 font-bold">Advance Salary</label>
                        <input
                          type="number"
                          value={formFields.advanceSalary}
                          onChange={(e) => setFormFields(prev => ({ ...prev, advanceSalary: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-450 font-bold font-mono">Provident Fund (PF)</label>
                        <input
                          type="number"
                          value={formFields.pf}
                          onChange={(e) => setFormFields(prev => ({ ...prev, pf: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-450 font-bold">Professional Tax</label>
                        <input
                          type="number"
                          value={formFields.professionalTax}
                          onChange={(e) => setFormFields(prev => ({ ...prev, professionalTax: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-450 font-bold">Income Tax</label>
                        <input
                          type="number"
                          value={formFields.incomeTax}
                          onChange={(e) => setFormFields(prev => ({ ...prev, incomeTax: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-455 font-bold">Unpaid Leave</label>
                        <input
                          type="number"
                          value={formFields.unpaidLeave}
                          onChange={(e) => setFormFields(prev => ({ ...prev, unpaidLeave: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-455 font-bold font-mono">Other Deductions</label>
                        <input
                          type="number"
                          value={formFields.otherDeductions}
                          onChange={(e) => setFormFields(prev => ({ ...prev, otherDeductions: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Edit Totals Summary */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 grid grid-cols-3 text-xs gap-4 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Gross Earnings:</span>
                    <span className="text-sm font-bold text-emerald-500 font-mono">₹{editFormTotals.earnings.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Total Deductions:</span>
                    <span className="text-sm font-bold text-rose-500 font-mono">₹{editFormTotals.deductions.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Net Salary Payable:</span>
                    <span className="text-sm font-black text-white font-mono">₹{editFormTotals.netSalary.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-2xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISBURSEMENT / PAY MODAL */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden backdrop-blur-md"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-200/60 dark:border-slate-800/60">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Record Salary Disbursement
                  </h3>
                  <span className="text-[10px] text-slate-400">Employee: {getEmployeeName(currentRecord?.employeeId)} (₹{currentRecord?.netSalary?.toLocaleString('en-IN')})</span>
                </div>
                <button onClick={() => setShowPayModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePaySubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-semibold rounded-xl flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={payFields.paidDate}
                    onChange={(e) => setPayFields(prev => ({ ...prev, paidDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Disbursement Method</label>
                  <select
                    value={payFields.paymentMethod}
                    onChange={(e) => setPayFields(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default SalaryManagement;