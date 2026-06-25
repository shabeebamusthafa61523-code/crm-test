import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  Edit3, 
  Eye, 
  Check, 
  X, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  approveExpense,
  getVendors 
} from '../../services/accountingService';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ExpenseManagement = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Sub-Tab Switcher: Operational vs Other
  const [subTab, setSubTab] = useState('Operational'); // 'Operational' or 'Other'

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  
  // Form fields
  const [formFields, setFormFields] = useState({
    expenseType: 'Operational',
    expenseName: '',
    expenseDate: '',
    vendorId: '',
    vendorName: '',
    gstNumber: '',
    invoiceNumber: '',
    category: 'Office Expense',
    amount: '',
    taxAmount: 0,
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
    description: ''
  });
  
  // Form Vendor mode selection: registered vs custom
  const [vendorMode, setVendorMode] = useState('registered'); 

  const [taxRate, setTaxRate] = useState(18); // Default 18% GST
  const [fileAttachment, setFileAttachment] = useState(null);
  const [formError, setFormError] = useState('');

  const categories = [
    'Office Expense',
    'Marketing',
    'Travel',
    'Utility Bills',
    'Maintenance',
    'Rent',
    'Fuel',
    'Software Subscription',
    'Miscellaneous'
  ];

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
      const accountant = String(designationId).trim() === '6a2f915e2df21dc234018cac';
      
      setIsAuthorized(adminOrHR || hrDesignation || accountant);
      setUserRole(role);
    }
    fetchVendors();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 25,
        search,
        status,
        category,
        expenseType: subTab, // Bound directly to subTab
        startDate,
        endDate
      };
      const res = await getExpenses(params);
      if (res.success) {
        setExpenses(res.data.expenses || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load expenses list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchExpenses();
    }
  }, [isAuthorized, subTab, currentPage, search, status, category, startDate, endDate]);

  const isPrivileged = ['1', '2', 'hr', 'admin'].includes(userRole);

  const fetchVendors = async () => {
    try {
      const res = await getVendors({ limit: 100 });
      if (res.success) {
        setVendors(res.data.vendors || []);
      }
    } catch (err) {
      console.error('Failed to load vendors list:', err);
    }
  };

  const handleSubTabChange = (type) => {
    setSubTab(type);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleAmountChange = (e) => {
    const amt = Number(e.target.value) || 0;
    const computedTax = Number(((amt * taxRate) / 100).toFixed(2));
    setFormFields(prev => ({
      ...prev,
      amount: e.target.value,
      taxAmount: computedTax
    }));
  };

  const handleTaxRateChange = (e) => {
    const rate = Number(e.target.value);
    setTaxRate(rate);
    const amt = Number(formFields.amount) || 0;
    const computedTax = Number(((amt * rate) / 100).toFixed(2));
    setFormFields(prev => ({
      ...prev,
      taxAmount: computedTax
    }));
  };

  const handleVendorChange = (e) => {
    const vId = e.target.value;
    const selected = vendors.find(v => v._id === vId);
    setFormFields(prev => ({
      ...prev,
      vendorId: vId,
      vendorName: selected ? selected.name : '',
      gstNumber: selected ? selected.gstNumber || '' : ''
    }));
  };

  const handleOpenAddModal = () => {
    setFormFields({
      expenseType: subTab,
      expenseName: '',
      expenseDate: new Date().toISOString().split('T')[0],
      vendorId: '',
      vendorName: '',
      gstNumber: '',
      invoiceNumber: '',
      category: 'Office Expense',
      amount: '',
      taxAmount: 0,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
      description: ''
    });
    setVendorMode('registered');
    setTaxRate(18);
    setFileAttachment(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (record) => {
    setCurrentRecord(record);
    const dateFormatted = record.expenseDate ? new Date(record.expenseDate).toISOString().split('T')[0] : '';
    
    // Estimate original tax rate
    const amt = record.amount || 1;
    const rateEstimate = Math.round((record.taxAmount / amt) * 100);
    setTaxRate([0, 5, 12, 18, 28].includes(rateEstimate) ? rateEstimate : 18);

    // Determine vendor mode based on whether a registered vendor ID exists
    const hasVendorId = !!(record.vendorId?._id || record.vendorId);
    setVendorMode(hasVendorId ? 'registered' : 'custom');

    setFormFields({
      expenseType: record.expenseType,
      expenseName: record.expenseName,
      expenseDate: dateFormatted,
      vendorId: record.vendorId?._id || record.vendorId || '',
      vendorName: record.vendorName,
      gstNumber: record.gstNumber || '',
      invoiceNumber: record.invoiceNumber,
      category: record.category,
      amount: record.amount,
      taxAmount: record.taxAmount,
      paymentMethod: record.paymentMethod,
      status: record.status,
      description: record.description || ''
    });
    setFileAttachment(null);
    setFormError('');
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formFields.expenseName || !formFields.amount || !formFields.expenseDate) {
      setFormError('Please fill in all required fields (Title, Date, Amount).');
      return;
    }

    const finalVendorName = String(formFields.vendorName || '').trim() || 'General';
    const finalInvoiceNumber = String(formFields.invoiceNumber || '').trim() || 'N/A';

    const fd = new FormData();
    Object.entries(formFields).forEach(([k, v]) => {
      if (k === 'vendorName') {
        fd.append(k, finalVendorName);
      } else if (k === 'invoiceNumber') {
        fd.append(k, finalInvoiceNumber);
      } else {
        fd.append(k, v !== undefined && v !== null ? v : '');
      }
    });
    if (fileAttachment) {
      fd.append('attachment', fileAttachment);
    }

    try {
      const res = await createExpense(fd);
      if (res.success) {
        setShowAddModal(false);
        fetchExpenses();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formFields.expenseName || !formFields.amount || !formFields.expenseDate) {
      setFormError('Please fill in all required fields (Title, Date, Amount).');
      return;
    }

    const finalVendorName = String(formFields.vendorName || '').trim() || 'General';
    const finalInvoiceNumber = String(formFields.invoiceNumber || '').trim() || 'N/A';

    const fd = new FormData();
    Object.entries(formFields).forEach(([k, v]) => {
      if (k === 'vendorName') {
        fd.append(k, finalVendorName);
      } else if (k === 'invoiceNumber') {
        fd.append(k, finalInvoiceNumber);
      } else {
        fd.append(k, v !== undefined && v !== null ? v : '');
      }
    });
    if (fileAttachment) {
      fd.append('attachment', fileAttachment);
    }

    try {
      const res = await updateExpense(currentRecord._id, fd);
      if (res.success) {
        setShowEditModal(false);
        fetchExpenses();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleApproveStatus = async (id, targetStatus) => {
    try {
      const res = await approveExpense(id, targetStatus);
      if (res.success) {
        fetchExpenses();
      }
    } catch (err) {
      alert(err.message || 'Failed to update approval status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await deleteExpense(id);
      if (res.success) {
        fetchExpenses();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete record');
    }
  };

  const exportToExcel = () => {
    const headers = [['Expense ID', 'Type', 'Name', 'Date', 'Vendor Name', 'GSTIN', 'Invoice #', 'Category', 'Pre-tax Amount (₹)', 'Tax (₹)', 'Total Amount (₹)', 'Method', 'Status', 'Description']];
    const data = expenses.map(exp => [
      exp._id,
      exp.expenseType,
      exp.expenseName,
      new Date(exp.expenseDate).toLocaleDateString('en-IN'),
      exp.vendorName,
      exp.gstNumber || 'N/A',
      exp.invoiceNumber,
      exp.category,
      exp.amount,
      exp.taxAmount,
      exp.totalAmount,
      exp.paymentMethod,
      exp.status,
      exp.description || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `Expense_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.text('CORPORATE EXPENSES MANAGEMENT REPORT', 14, 15);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

    const data = expenses.map((exp, i) => [
      i + 1,
      new Date(exp.expenseDate).toLocaleDateString('en-IN'),
      exp.expenseName,
      exp.vendorName,
      exp.category,
      `INR ${Number(exp.totalAmount).toFixed(2)}`,
      exp.status
    ]);

    doc.autoTable({
      startY: 25,
      head: [['SI', 'Date', 'Name', 'Vendor', 'Category', 'Total Cost', 'Status']],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Expense_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
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
          This expense tracking module is accessible strictly to authorized finance personnel.
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/50 backdrop-blur-md rounded-[2rem] p-6 shadow-xl space-y-6"
    >
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
            Corporate Expenses Ledger
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Manage operational and other outlays</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 border rounded-2xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer
              ${showFilters 
                ? 'bg-indigo-650/10 border-indigo-500/30 text-indigo-600' 
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
              }`}
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>

          <button
            onClick={exportToExcel}
            className="p-2.5 bg-emerald-600/5 hover:bg-emerald-600/10 border border-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </button>

          <button
            onClick={exportToPDF}
            className="p-2.5 bg-rose-600/5 hover:bg-rose-600/10 border border-rose-500/10 rounded-2xl text-rose-600 dark:text-rose-450 transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer"
          >
            <FileText size={14} />
            <span>PDF</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="p-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-md shadow-indigo-500/10 active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer"
          >
            <Plus size={14} />
            <span>File Expense</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/60 pb-1 mb-4 gap-2">
        <button
          onClick={() => handleSubTabChange('Operational')}
          className={`relative px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer select-none
            ${subTab === 'Operational' ? 'text-indigo-550 dark:text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <span>Operating Expenses</span>
          {subTab === 'Operational' && (
            <motion.div layoutId="expenseSubTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>
        <button
          onClick={() => handleSubTabChange('Other')}
          className={`relative px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer select-none
            ${subTab === 'Other' ? 'text-indigo-555 dark:text-white' : 'text-slate-400 hover:text-slate-205'}`}
        >
          <span>Other / Petty Cash</span>
          {subTab === 'Other' && (
            <motion.div layoutId="expenseSubTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>
      </div>

      {/* Filters drawer */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Search</label>
                <div className="relative mt-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Expense or Vendor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Date bounds</label>
                <div className="flex gap-1 items-center mt-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] focus:outline-none"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleResetFilters}
                  className="w-full py-2 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ledger Table */}
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="py-20 flex justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-indigo-650 border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[9px] font-black uppercase text-slate-400 tracking-wider bg-white/5 dark:bg-slate-950/20">
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Expense Particulars</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Vendor / Supplier</th>
                <th className="py-3 px-2">Invoice #</th>
                <th className="py-3 px-2 text-right">Cost (incl. Tax)</th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-2 text-center">Receipt</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-700 dark:text-slate-300 text-xs">
              {expenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-white/5 transition-all group">
                  <td className="py-3.5 px-2 text-[10px] font-bold text-slate-400">
                    {new Date(exp.expenseDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3.5 px-2">
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100">{exp.expenseName}</span>
                    <span className="block text-[8px] text-indigo-400 font-bold uppercase">{exp.expenseType}</span>
                  </td>
                  <td className="py-3.5 px-2 text-[10px] font-bold text-slate-500">{exp.category}</td>
                  <td className="py-3.5 px-2 text-[10px] font-bold text-slate-800 dark:text-slate-200">{exp.vendorName}</td>
                  <td className="py-3.5 px-2 text-[10px] font-black text-indigo-500">{exp.invoiceNumber}</td>
                  <td className="py-3.5 px-2 text-right font-mono">
                    <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">
                      ₹{Number(exp.totalAmount || exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {exp.taxAmount > 0 && (
                      <span className="block text-[8px] text-slate-450 font-medium">Incl. ₹{exp.taxAmount} GST</span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1
                      ${exp.status === 'Paid' ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/10' :
                        exp.status === 'Approved' ? 'text-indigo-600 bg-indigo-500/5 border border-indigo-500/10' :
                        exp.status === 'Rejected' ? 'text-rose-500 bg-rose-500/5 border border-rose-500/10' :
                        'text-amber-500 bg-amber-500/5 border border-amber-500/10'}`}
                    >
                      {exp.status === 'Paid' && <CheckCircle size={10} />}
                      {exp.status === 'Pending' && <Clock size={10} />}
                      {exp.status === 'Rejected' && <XCircle size={10} />}
                      {exp.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {exp.attachmentUrl ? (
                      <a
                        href={exp.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
                      >
                        <Eye size={12} />
                      </a>
                    ) : (
                      <span className="text-[9px] text-slate-350 italic">None</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isPrivileged && exp.status === 'Pending' && (
                        <div className="flex gap-1.5 mr-2">
                          <button
                            onClick={() => handleApproveStatus(exp._id, 'Approved')}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                            title="Approve Expense"
                          >
                            <Check size={11} />
                          </button>
                          <button
                            onClick={() => handleApproveStatus(exp._id, 'Rejected')}
                            className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer"
                            title="Reject Expense"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      )}

                      {isPrivileged && exp.status === 'Approved' && (
                        <button
                          onClick={() => handleApproveStatus(exp._id, 'Paid')}
                          className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider rounded-lg shadow-sm mr-2 active:scale-95 cursor-pointer"
                        >
                          Disburse
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {exp.status !== 'Paid' && (
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-lg cursor-pointer"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(exp._id)}
                          className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    No expense records logged
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Showing page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 disabled:opacity-30 cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={currentPage === pagination.pages}
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-650 disabled:opacity-30 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* --- ADD EXPENSE MODAL (Framer Motion Slide-up) --- */}
      <AnimatePresence>
        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)} title="File Corporate Expense Outlay">
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-tight rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Expense Type *</label>
                  <select
                    value={formFields.expenseType}
                    onChange={(e) => setFormFields(prev => ({ ...prev, expenseType: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Operational">Operational Expense</option>
                    <option value="Other">Other Expense (Non-operational / Petty Cash)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formFields.expenseDate}
                    onChange={(e) => setFormFields(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Expense Title/Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Web Server Subscriptions"
                    value={formFields.expenseName}
                    onChange={(e) => setFormFields(prev => ({ ...prev, expenseName: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Category *</label>
                  <select
                    value={formFields.category}
                    onChange={(e) => setFormFields(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Vendor Mode Selector */}
                <div className="sm:col-span-2 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3 space-y-3 bg-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Vendor Particulars (Optional)</span>
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setVendorMode('registered')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${vendorMode === 'registered' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Registered Vendor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVendorMode('custom');
                          setFormFields(prev => ({ ...prev, vendorId: '', vendorName: '' }));
                        }}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${vendorMode === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Custom / Petty Vendor
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vendorMode === 'registered' ? (
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-405 tracking-widest">Select Registered Vendor</label>
                        <select
                          value={formFields.vendorId}
                          onChange={handleVendorChange}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                        >
                          <option value="">-- Choose Vendor --</option>
                          {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-405 tracking-widest">Type Custom Vendor Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Local Stall (Defaults to General)"
                          value={formFields.vendorName}
                          onChange={(e) => setFormFields(prev => ({ ...prev, vendorName: e.target.value, vendorId: '' }))}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-405 tracking-widest">GSTIN Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 27AAAAA1111A1Z1 (Optional)"
                        value={formFields.gstNumber}
                        onChange={(e) => setFormFields(prev => ({ ...prev, gstNumber: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Invoice Reference # (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-99 (Defaults to N/A)"
                    value={formFields.invoiceNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tax GST Rate (%)</label>
                  <select
                    value={taxRate}
                    onChange={handleTaxRateChange}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value={0}>0% Tax Exemption</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Method *</label>
                  <select
                    value={formFields.paymentMethod}
                    onChange={(e) => setFormFields(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Net Amount (₹ Pre-tax) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="0.00"
                    value={formFields.amount}
                    onChange={handleAmountChange}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl flex justify-between items-center text-xs">
                    <span className="font-black uppercase tracking-wider text-slate-400">Total Charged Outlay (incl. Tax)</span>
                    <span className="text-sm font-black text-indigo-505 font-mono">
                      ₹{(Number(formFields.amount || 0) + Number(formFields.taxAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Description/Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Justification, department allocations..."
                  value={formFields.description}
                  onChange={(e) => setFormFields(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Receipt Invoice upload (Max 10MB)</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFileAttachment(e.target.files[0])}
                  className="w-full mt-1 text-[10px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-indigo-650/10 file:text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-550 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-md active:scale-95 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Record Outlay
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* --- EDIT EXPENSE MODAL (Framer Motion Slide-up) --- */}
      <AnimatePresence>
        {showEditModal && (
          <Modal onClose={() => setShowEditModal(false)} title="Update Filed Expense Details">
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-tight rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Expense Type *</label>
                  <select
                    value={formFields.expenseType}
                    onChange={(e) => setFormFields(prev => ({ ...prev, expenseType: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Operational">Operational Expense</option>
                    <option value="Other">Other Expense (Non-operational / Petty Cash)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formFields.expenseDate}
                    onChange={(e) => setFormFields(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Expense Title/Name *</label>
                  <input
                    type="text"
                    required
                    value={formFields.expenseName}
                    onChange={(e) => setFormFields(prev => ({ ...prev, expenseName: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Category *</label>
                  <select
                    value={formFields.category}
                    onChange={(e) => setFormFields(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Vendor Mode Selector */}
                <div className="sm:col-span-2 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3 space-y-3 bg-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Vendor Particulars (Optional)</span>
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setVendorMode('registered')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${vendorMode === 'registered' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Registered Vendor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVendorMode('custom');
                          setFormFields(prev => ({ ...prev, vendorId: '', vendorName: '' }));
                        }}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${vendorMode === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Custom / Petty Vendor
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vendorMode === 'registered' ? (
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-405 tracking-widest">Select Registered Vendor</label>
                        <select
                          value={formFields.vendorId}
                          onChange={handleVendorChange}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                        >
                          <option value="">-- Choose Vendor --</option>
                          {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-405 tracking-widest">Type Custom Vendor Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Local Stall (Defaults to General)"
                          value={formFields.vendorName}
                          onChange={(e) => setFormFields(prev => ({ ...prev, vendorName: e.target.value, vendorId: '' }))}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-405 tracking-widest">GSTIN Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 27AAAAA1111A1Z1 (Optional)"
                        value={formFields.gstNumber}
                        onChange={(e) => setFormFields(prev => ({ ...prev, gstNumber: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Invoice Reference # (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-99 (Defaults to N/A)"
                    value={formFields.invoiceNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tax GST Rate (%)</label>
                  <select
                    value={taxRate}
                    onChange={handleTaxRateChange}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value={0}>0% Tax Exemption</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Method *</label>
                  <select
                    value={formFields.paymentMethod}
                    onChange={(e) => setFormFields(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Net Amount (₹ Pre-tax) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={formFields.amount}
                    onChange={handleAmountChange}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="bg-slate-955/50 border border-slate-850 p-4 rounded-2xl flex justify-between items-center text-xs">
                    <span className="font-black uppercase tracking-wider text-slate-400">Total Charged Outlay (incl. Tax)</span>
                    <span className="text-sm font-black text-indigo-505 font-mono">
                      ₹{(Number(formFields.amount || 0) + Number(formFields.taxAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Description/Remarks</label>
                <textarea
                  rows="2"
                  value={formFields.description}
                  onChange={(e) => setFormFields(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Update Receipt attachment</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFileAttachment(e.target.files[0])}
                  className="w-full mt-1 text-[10px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-indigo-650/10 file:text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-550 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-md active:scale-95 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Modal = ({ onClose, title, children }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white/95 dark:bg-slate-905/95 border border-white/20 dark:border-slate-800/80 backdrop-blur-md rounded-[2.5rem] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-405 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

export default ExpenseManagement;