import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Printer, 
  Eye, 
  X, 
  TrendingUp, 
  Coins, 
  ShieldAlert, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { getSalarySlips, createSalarySlip, publishSalarySlip } from '../../services/hrSalarySlipService';
import axios from 'axios';

const rawApiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 6 }, (_, i) => 2025 + i);

const EmployeePortal = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  
  // HR Helper Data (only loaded if user is HR manager/admin)
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stepper State
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

  const isHRManager = useMemo(() => {
    if (!currentUser) return false;
    const role = String(currentUser.role_id || currentUser.roleId || currentUser.role || '').toLowerCase().trim();
    const designationId = String(currentUser.designationId?._id || currentUser.designationId || currentUser.designation_id || '').trim();
    return ['1', '2', 'hr', 'admin'].includes(role) || ['1', '6a2f8efea2fe388770a38987'].includes(designationId);
  }, [currentUser]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userObj = JSON.parse(savedUser);
      setCurrentUser(userObj);
      fetchHistory();
      
      const role = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
      const designationId = String(userObj.designationId?._id || userObj.designationId || userObj.designation_id || '').trim();
      const isHR = ['1', '2', 'hr', 'admin'].includes(role) || ['1', '6a2f8efea2fe388770a38987'].includes(designationId);
      
      if (isHR) {
        fetchHelperData();
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getSalarySlips(); // Backend automatically filters by req.user.id & status='Published' for employees
      if (res.success) {
        const data = res.data.slips || [];
        const sorted = data.sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.month - a.month;
        });
        setSalaryHistory(sorted);
      }
    } catch (err) {
      console.error('Failed to load employee salary portal sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHelperData = async () => {
    try {
      const rawToken = localStorage.getItem('token');
      const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
      const headers = { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
      
      // Fetch users
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
      console.error('Failed to load helpers in portal:', err);
    }
  };

  const showToastMsg = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownloadPDFSlip = async (id, monthStr) => {
    if (!currentUser) return;
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
      link.setAttribute('download', `SalarySlip_${currentUser.name.replace(/\s+/g, '_')}_${monthStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToastMsg('Download completed');
    } catch (err) {
      showToastMsg(err.message || 'Failed to download slip PDF', 'error');
    }
  };

  const handlePrintSlip = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #salary-slip-printable-portal, #salary-slip-printable-portal * { visibility: visible; }
        #salary-slip-printable-portal { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; padding: 0; margin: 0; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  // Selected employee meta for Quick Generate
  const selectedEmployeeMeta = useMemo(() => {
    if (!createForm.employeeId) return null;
    return employees.find(e => String(e._id) === String(createForm.employeeId));
  }, [createForm.employeeId, employees]);

  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => String(e._id) === String(empId));
    setCreateForm(prev => ({
      ...prev,
      employeeId: empId,
      basicSalary: emp?.salary || '',
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

  const handleStep1Continue = () => {
    setCreateError('');
    if (!createForm.employeeId) {
      setCreateError('Please select an employee');
      return;
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (createForm.year > currentYear || (Number(createForm.year) === currentYear && Number(createForm.month) > currentMonth)) {
      setCreateError('Cannot generate salary slips for future months');
      return;
    }
    setCreateStep(2);
  };

  const handleStep2Continue = () => {
    setCreateError('');
    const basic = parseFloat(createForm.basicSalary);
    if (isNaN(basic) || basic < 0 || basic > 500000) {
      setCreateError('Basic Salary must be between ₹0 and ₹500,000');
      return;
    }
    setCreateStep(3);
  };

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
        fetchHistory();
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
        fetchHistory();
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

  // SVG credit history trend chart
  const salaryChart = useMemo(() => {
    if (salaryHistory.length === 0) return null;
    const data = [...salaryHistory].reverse().slice(-6);
    if (data.length === 0) return null;

    const width = 500;
    const height = 180;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;

    const values = data.map(d => d.netPay || 0);
    const maxVal = Math.max(...values, 1000) * 1.15;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    const barWidth = Math.min(35, (chartWidth / data.length) * 0.5);
    const stepX = chartWidth / data.length;

    return (
      <div className="w-full bg-slate-905/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">My Salary Credit History (Past 6 Months)</span>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + (1 - ratio) * chartHeight;
            const amt = Math.round((ratio * maxVal) / 1000) * 1000;
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="8" fontWeight="bold">
                  ₹{amt.toLocaleString('en-IN')}
                </text>
              </g>
            );
          })}
          {data.map((h, i) => {
            const val = h.netPay || 0;
            const barHeight = (val / maxVal) * chartHeight;
            const x = paddingLeft + i * stepX + (stepX - barWidth) / 2;
            const y = height - paddingBottom - barHeight;
            const monthLabel = MONTHS[h.month - 1].slice(0, 3);
            return (
              <g key={i} className="group">
                <rect 
                  x={x} 
                  y={y} 
                  width={barWidth} 
                  height={barHeight} 
                  className="fill-indigo-600 dark:fill-indigo-500 rounded-lg cursor-pointer hover:fill-lime-400 transition-all duration-300"
                  rx="4"
                />
                <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
                  {monthLabel}
                </text>
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-slate-800 dark:fill-white" fontSize="8" fontWeight="black" fontFamily="monospace">
                  ₹{val.toLocaleString('en-IN')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }, [salaryHistory]);

  if (!currentUser) {
    return (
      <div className="flex flex-col justify-center items-center py-24 text-slate-400 gap-3 min-h-[50vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-t-transparent border-[#0B1F4B] dark:border-[#4DB848] rounded-full"
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Initializing payroll workspace...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-2 pb-20">
      
      {/* TOAST SYSTEM */}
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

      {/* HR MANAGER QUICK ACCESSIBLE INLINE PANEL */}
      {isHRManager && (
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
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-black uppercase tracking-wider rounded-xl disabled:opacity-50"
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
      )}

      {/* PORTAL TOP COVER PANEL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1.5 text-center sm:text-left">
          <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-xl">
            Employee Self-Service Portal
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Welcome, {currentUser?.name || 'User'}</h2>
          <span className="text-[11px] text-slate-400 block font-semibold">
            Registered Email: {currentUser?.email || 'N/A'} | ID: <span className="font-mono">{currentUser?.employeeId || 'N/A'}</span>
          </span>
        </div>

        {salaryHistory.length > 0 && (
          <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl text-center min-w-44">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Last Credited Net Salary</span>
            <span className="text-xl font-black text-lime-400 block font-mono">
              ₹{(salaryHistory[0].netPay || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Period: {MONTHS[salaryHistory[0].month - 1]} {salaryHistory[0].year}
            </span>
          </div>
        )}
      </div>

      {/* RENDER TREND DETAILS CHART */}
      {salaryHistory.length > 0 && salaryChart}

      {/* LIST OF ISSUED SLIPS */}
      <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50">
          <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">My Salary Slip Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-800/60 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                <th className="py-3 px-6">Disbursed Month</th>
                <th className="py-3 px-6 text-right">Basic Salary</th>
                <th className="py-3 px-6 text-right">Allowances</th>
                <th className="py-3 px-6 text-right">Deductions</th>
                <th className="py-3 px-6 text-right">Net Received</th>
                <th className="py-3 px-6 text-center">Location</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"
                      />
                      <span>Retrieving personal payroll slips...</span>
                    </div>
                  </td>
                </tr>
              ) : salaryHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No salary slips have been disbursed yet for your profile.
                  </td>
                </tr>
              ) : (
                salaryHistory.map((h, idx) => {
                  const allowances = (h.totalEarnings || 0) - (h.basicSalary || 0);
                  const monthStr = `${MONTHS[h.month - 1]} ${h.year}`;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900 dark:text-white">{monthStr}</div>
                        <span className="text-[10px] text-slate-400 block font-mono">{h.salarySlipNumber || 'SLIP-ISSUED'}</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono">₹{h.basicSalary?.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-6 text-right font-mono text-emerald-500">+₹{allowances?.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-6 text-right font-mono text-rose-500">-₹{h.totalDeductions?.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-6 text-right font-black text-slate-900 dark:text-white font-mono font-mono">₹{h.netPay?.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-6 text-center font-semibold text-slate-500">{h.location || 'Malappuram'}</td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSlip(h);
                              setShowPreviewModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-850 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Eye size={12} /> View Slip
                          </button>
                          <button
                            onClick={() => handleDownloadPDFSlip(h._id, `${MONTHS[h.month - 1]}_${h.year}`)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-850 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Download size={12} /> Download
                          </button>
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

      {/* CREATE SALARY SLIP MODAL (3 Steps Wizard) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden my-8"
          >
            
            <div className="flex justify-between items-center p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-955/20">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Generate New Salary Slip</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Wizard Progress: Step {createStep} of 3</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-650"
              >
                <X size={16} />
              </button>
            </div>

            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 flex">
              <div className={`h-full bg-[#4DB848] transition-all duration-300 ${createStep === 1 ? 'w-1/3' : createStep === 2 ? 'w-2/3' : 'w-full'}`} />
            </div>

            <div className="p-6">
              {createError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={15} />
                  <span>{createError}</span>
                </div>
              )}

              {/* STEP 1: Selection */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Department</label>
                      <input
                        type="text"
                        value={selectedEmployeeMeta?.department || ''}
                        disabled
                        placeholder="N/A"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-955 text-slate-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Designation</label>
                      <input
                        type="text"
                        value={selectedEmployeeMeta?.designationId?.name || selectedEmployeeMeta?.designation || ''}
                        disabled
                        placeholder="N/A"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-955 text-slate-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Office Location</label>
                      <select
                        value={createForm.location}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-xs focus:outline-none"
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

              {/* STEP 2: Breakdown */}
              {createStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-955/10">
                      <h4 className="text-xs font-black text-[#0B1F4B] dark:text-[#4DB848] uppercase tracking-wide border-b pb-1.5">Earnings</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="col-span-2 space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Basic Salary *</label>
                          <input
                            type="number"
                            value={createForm.basicSalary}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">HRA</label>
                          <input
                            type="number"
                            value={createForm.houseRentAllowance}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, houseRentAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Special Allowance</label>
                          <input
                            type="number"
                            value={createForm.specialAllowance}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, specialAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Transport</label>
                          <input
                            type="number"
                            value={createForm.transportAllowance}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, transportAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Other</label>
                          <input
                            type="number"
                            value={createForm.otherAllowance}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, otherAllowance: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider text-[#4DB848] font-bold">Integrity Award</label>
                          <input
                            type="number"
                            value={createForm.kodbrandIntegrityAward}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, kodbrandIntegrityAward: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border border-[#4DB848]/30 bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                      </div>
                      <div className="border-t pt-3 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-500">Total Earnings:</span>
                        <span className="font-mono font-black text-slate-800 dark:text-white">₹{createTotals.earnings.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-955/10">
                      <h4 className="text-xs font-black text-rose-500 uppercase tracking-wide border-b pb-1.5">Deductions</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Advance</label>
                          <input
                            type="number"
                            value={createForm.advanceSalary}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, advanceSalary: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">PF</label>
                          <input
                            type="number"
                            value={createForm.providentFund}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, providentFund: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Professional Tax</label>
                          <input
                            type="number"
                            value={createForm.professionalTax}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, professionalTax: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Income Tax</label>
                          <input
                            type="number"
                            value={createForm.incomeTax}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, incomeTax: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Unpaid Leave</label>
                          <input
                            type="number"
                            value={createForm.unpaidLeaveDeduction}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, unpaidLeaveDeduction: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Other</label>
                          <input
                            type="number"
                            value={createForm.otherDeductions}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, otherDeductions: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs"
                          />
                        </div>
                      </div>
                      <div className="border-t pt-3 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-500">Total Deductions:</span>
                        <span className="font-mono font-black text-slate-800 dark:text-white">₹{createTotals.deductions.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-2 border-[#4DB848]/40 bg-[#4DB848]/5 rounded-2xl flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-[#0B1F4B] tracking-wider">Net Pay</span>
                    <span className="text-base font-mono font-black text-[#4DB848]">₹{createTotals.netPay.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* STEP 3: Attendance */}
              {createStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Working Days *</label>
                      <input
                        type="number"
                        value={createForm.workingDays}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, workingDays: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-2xl border text-xs bg-white dark:bg-slate-950 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Days Worked *</label>
                      <input
                        type="number"
                        value={createForm.daysWorked}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, daysWorked: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-2xl border text-xs bg-white dark:bg-slate-950 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Days on Leave</label>
                      <input
                        type="number"
                        value={Number(createForm.workingDays || 0) - Number(createForm.daysWorked || 0)}
                        disabled
                        className="w-full px-4 py-2.5 rounded-2xl border text-xs bg-slate-50 dark:bg-slate-955 text-slate-400"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks / Notes</label>
                      <textarea
                        value={createForm.remarks}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, remarks: e.target.value }))}
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-2xl border text-xs bg-white dark:bg-slate-950 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                {createStep > 1 && (
                  <button
                    onClick={() => setCreateStep(s => s - 1)}
                    className="flex items-center gap-1 px-4 py-2 border rounded-xl text-slate-500 text-xs font-bold"
                  >
                    <ChevronLeft size={14} /> Back
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {createStep < 3 ? (
                  <button
                    onClick={createStep === 1 ? handleStep1Continue : handleStep2Continue}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0B1F4B] hover:bg-[#0B1F4B]/95 text-white text-xs font-black uppercase tracking-wider rounded-2xl"
                  >
                    Continue <ChevronRight size={14} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleCreateSubmit(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 border rounded-2xl text-xs font-black uppercase tracking-wider text-slate-500 disabled:opacity-50"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={() => handleCreateSubmit(true)}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-emerald-650 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check size={14} /> Publish & Send
                    </button>
                  </>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}

      {/* PREVIEW SLIP DETAILS MODAL */}
      {showPreviewModal && selectedSlip && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-200/60 dark:border-slate-800/60">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Personal Salary Slip Sheet
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSlip}
                  className="flex items-center gap-1 px-4 py-2 bg-[#0B1F4B] hover:bg-[#0B1F4B]/90 text-white text-xs font-bold rounded-2xl"
                >
                  <Printer size={13} /> Print Slip
                </button>
                <button onClick={() => setShowPreviewModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-105">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto max-h-[70vh]">
              <div 
                id="salary-slip-printable-portal"
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
                    <span className="text-[6.5px] font-semibold text-slate-350 block tracking-wider mt-0.5 mt-0.5">FOR THE MONTH OF</span>
                    <span className="text-[#4DB848] text-[9.5px] font-extrabold block tracking-wide uppercase mt-0.5">
                      {MONTHS[selectedSlip.month - 1]} {selectedSlip.year}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div>
                    <h4 className="text-[9px] font-extrabold text-[#0B1F4B] border-b border-slate-200 pb-1 uppercase tracking-wider">Employee Details</h4>
                    <table className="w-full text-left mt-2 border-collapse text-[10px]">
                      <tbody>
                        <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold w-1/3">Employee ID</td><td className="py-1 text-slate-800 font-bold">{currentUser.employeeId || 'N/A'}</td></tr>
                        <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Employee Name</td><td className="py-1 text-slate-800 font-bold">{currentUser.name || 'N/A'}</td></tr>
                        <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Department</td><td className="py-1 text-slate-800 font-semibold">{currentUser.department || 'N/A'}</td></tr>
                        <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Designation</td><td className="py-1 text-slate-800 font-semibold">{currentUser.designationId?.name || currentUser.designation || 'Staff'}</td></tr>
                        <tr className="border-b border-slate-50"><td className="py-1 text-slate-400 font-semibold">Location</td><td className="py-1 text-slate-800 font-semibold">{selectedSlip.location || 'Malappuram'}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-extrabold text-[#0B1F4B] border-b border-slate-200 pb-1 uppercase tracking-wider">Pay Period Details</h4>
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

                {selectedSlip.remarks && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-[10px] text-slate-550 leading-normal">
                    <span className="font-black uppercase text-[#0B1F4B] block mb-1">Remarks:</span>
                    <span>{selectedSlip.remarks}</span>
                  </div>
                )}

                {/* Footer Section */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-[9px] text-slate-500">
                  <div className="space-y-0.5 leading-relaxed">
                    <span className="font-bold text-[#0B1F4B] text-[9.5px] block">KODBRAND SOLUTIONS</span>
                    <span>3rd Floor, Aranyakam Building, Thamarakuzhi Road,</span>
                    <span>Malappuram, Kerala - 676505</span>
                    <span className="block">Building No: 14/319</span>
                    <span className="block">info@kodbrand.com | www.kodbrand.com</span>
                    <span className="block font-semibold">CIN: U72900KA2024PTC123456</span>
                  </div>

                  <div className="text-center flex flex-col items-center justify-center space-y-1">
                    <span className="font-extrabold text-[#4DB848] text-xs block">Thank You</span>
                    <span className="font-semibold italic text-[#4DB848] text-[9px] block">For Your Contribution</span>
                    <span className="text-[7.5px] text-slate-400 block max-w-44 leading-tight mt-1">Your dedication and hard work drive our success.</span>
                  </div>

                  <div className="text-center flex flex-col items-center justify-end space-y-5 h-full">
                    <div className="w-28 border-b border-slate-300 h-8"></div>
                    <div className="space-y-0.5 text-[8.5px]">
                      <span className="font-bold text-slate-700 block leading-none">Authorised Signatory</span>
                      <span className="font-semibold text-[#0B1F4B] block uppercase leading-none">KODBRAND SOLUTIONS</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B1F4B] text-white px-3 py-1.5 rounded-md flex justify-between items-center text-[7.5px] mt-2">
                  <span>We value your efforts and look forward to achieving greater success together.</span>
                  <span className="font-semibold flex items-center gap-0.5">
                    Building Brands. Driving Growth. ★
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default EmployeePortal;
