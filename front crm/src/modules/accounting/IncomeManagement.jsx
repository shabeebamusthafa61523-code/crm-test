import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Trash2, 
  Edit3, 
  Paperclip, 
  Eye, 
  Calendar,
  X,
  CheckCircle,
  AlertCircle,
  Coins,
  ShieldAlert
} from 'lucide-react';
import { 
  getIncomes, 
  createIncome, 
  updateIncome, 
  deleteIncome, 
  getCustomers 
} from '../../services/accountingService';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const IncomeManagement = () => {
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  
  // Form fields
  const [formFields, setFormFields] = useState({
    date: '',
    customerId: '',
    customerName: '',
    invoiceNumber: '',
    gstNumber: '',
    paymentMethod: 'Bank Transfer',
    amount: '',
    description: '',
    status: 'Active'
  });
  const [fileAttachment, setFileAttachment] = useState(null);
  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await getCustomers({ limit: 100 });
      if (res.success) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.error('Failed to load customers list:', err);
    }
  };

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 25,
        search,
        status,
        customerId,
        paymentMethod,
        startDate,
        endDate
      };
      const res = await getIncomes(params);
      if (res.success) {
        setIncomes(res.data.incomes || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to retrieve incomes:', err);
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
      const accountant = String(designationId).trim() === '6a2f915e2df21dc234018cac';
      
      setIsAuthorized(adminOrHR || hrDesignation || accountant);
    }
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchIncomes();
    }
  }, [isAuthorized, currentPage, search, status, customerId, paymentMethod, startDate, endDate]);

  // Aggregate stats from ledger
  const totalRevenue = useMemo(() => {
    return incomes.reduce((sum, item) => item.status === 'Active' ? sum + Number(item.amount || 0) : sum, 0);
  }, [incomes]);

  const clearedInvoices = useMemo(() => {
    return incomes.filter(item => item.status === 'Active' && item.invoiceNumber).length;
  }, [incomes]);

  const pendingRevenue = useMemo(() => {
    return incomes.reduce((sum, item) => ['Pending', 'Disputed'].includes(item.status) ? sum + Number(item.amount || 0) : sum, 0);
  }, [incomes]);

  const pendingPaymentsCount = useMemo(() => {
    return incomes.filter(item => ['Pending', 'Disputed'].includes(item.status)).length;
  }, [incomes]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setCustomerId('');
    setPaymentMethod('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleOpenAddModal = () => {
    setFormFields({
      date: new Date().toISOString().split('T')[0],
      customerId: '',
      customerName: '',
      invoiceNumber: '',
      gstNumber: '',
      paymentMethod: 'Bank Transfer',
      amount: '',
      description: '',
      status: 'Active'
    });
    setFileAttachment(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (record) => {
    setCurrentRecord(record);
    const dateFormatted = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
    setFormFields({
      date: dateFormatted,
      customerId: record.customerId?._id || record.customerId || '',
      customerName: record.customerName,
      invoiceNumber: record.invoiceNumber,
      gstNumber: record.gstNumber || '',
      paymentMethod: record.paymentMethod,
      amount: record.amount,
      description: record.description || '',
      status: record.status
    });
    setFileAttachment(null);
    setFormError('');
    setShowEditModal(true);
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const selected = customers.find(c => c._id === custId);
    setFormFields(prev => ({
      ...prev,
      customerId: custId,
      customerName: selected ? selected.name : '',
      gstNumber: selected ? selected.gstNumber || '' : ''
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formFields.customerId || !formFields.invoiceNumber || !formFields.amount) {
      setFormError('Please fill in all required fields (Customer, Invoice, Amount).');
      return;
    }

    const fd = new FormData();
    Object.entries(formFields).forEach(([k, v]) => {
      fd.append(k, v);
    });
    if (fileAttachment) {
      fd.append('attachment', fileAttachment);
    }

    try {
      const res = await createIncome(fd);
      if (res.success) {
        setShowAddModal(false);
        fetchIncomes();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formFields.customerId || !formFields.invoiceNumber || !formFields.amount) {
      setFormError('Please fill in all required fields (Customer, Invoice, Amount).');
      return;
    }

    const fd = new FormData();
    Object.entries(formFields).forEach(([k, v]) => {
      fd.append(k, v);
    });
    if (fileAttachment) {
      fd.append('attachment', fileAttachment);
    }

    try {
      const res = await updateIncome(currentRecord._id, fd);
      if (res.success) {
        setShowEditModal(false);
        fetchIncomes();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this income record?')) return;
    try {
      const res = await deleteIncome(id);
      if (res.success) {
        fetchIncomes();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete record');
    }
  };

  const exportToExcel = () => {
    const headers = [['Income ID', 'Date', 'Customer Name', 'Invoice Number', 'GST Number', 'Payment Method', 'Amount (₹)', 'Status', 'Description']];
    const data = incomes.map(inc => [
      inc._id,
      new Date(inc.date).toLocaleDateString('en-IN'),
      inc.customerName,
      inc.invoiceNumber,
      inc.gstNumber || 'N/A',
      inc.paymentMethod,
      inc.amount,
      inc.status,
      inc.description || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incomes');
    XLSX.writeFile(wb, `Income_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.text('INCOME MANAGEMENT SUMMARY REPORT', 14, 15);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

    const data = incomes.map((inc, i) => [
      i + 1,
      new Date(inc.date).toLocaleDateString('en-IN'),
      inc.customerName,
      inc.invoiceNumber,
      inc.paymentMethod,
      `INR ${Number(inc.amount).toFixed(2)}`,
      inc.status
    ]);

    doc.autoTable({
      startY: 25,
      head: [['SI', 'Date', 'Customer', 'Invoice #', 'Method', 'Amount', 'Status']],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [60, 35, 117] }
    });

    doc.save(`Income_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
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
          This income tracking module is accessible strictly to authorized finance personnel.
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-6"
    >
      
      {/* 1. FLOATING GLASSMORPHIC METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Total Incoming Revenue */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-emerald-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Coins size={80} className="text-emerald-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-405">Total Incoming Revenue</span>
          <h3 className="text-2xl font-black text-slate-850 dark:text-white font-mono mt-2">
            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-tight mt-1">▲ Reconciled revenues</p>
        </motion.div>

        {/* Card 2: Cleared Invoices */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-indigo-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle size={80} className="text-indigo-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-405">Cleared Invoices</span>
          <h3 className="text-2xl font-black text-slate-850 dark:text-white font-mono mt-2">
            {clearedInvoices}
          </h3>
          <p className="text-[9px] text-indigo-505 font-bold uppercase tracking-tight mt-1">● Settled payments</p>
        </motion.div>

        {/* Card 3: Pending/Unreconciled Cash Flow */}
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-amber-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle size={80} className="text-amber-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-405">Pending / Unreconciled</span>
          <h3 className="text-2xl font-black text-slate-850 dark:text-white font-mono mt-2">
            ₹{pendingRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[9px] text-amber-505 font-bold uppercase tracking-tight mt-1">■ {pendingPaymentsCount} entries awaiting clearance</p>
        </motion.div>
      </div>

      {/* 2. LEDGER CONSOLE */}
      <div className="bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/50 backdrop-blur-md rounded-[2rem] p-6 shadow-xl space-y-6">
        
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Income Ledger Console
            </h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Process cash flows and incoming customer funding</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-2xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer
                ${showFilters 
                  ? 'bg-indigo-650/10 border-indigo-500/30 text-indigo-600' 
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-350'
                }`}
            >
              <Filter size={14} />
              <span>Filters</span>
            </button>

            <button
              onClick={exportToExcel}
              className="p-2.5 bg-emerald-605/5 hover:bg-emerald-600/10 border border-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer"
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
              <span>Record Income</span>
            </button>
          </div>
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
                      placeholder="Invoice # or desc..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Customer</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Customers</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] focus:outline-none"
                  >
                    <option value="">All Methods</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Digital Wallet">Digital Wallet</option>
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
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                    <option value="Disputed">Disputed</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={handleResetFilters}
                    className="w-full py-2 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incomes Ledger Table */}
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
                  <th className="py-3 px-2">Customer / Payer</th>
                  <th className="py-3 px-2">Invoice #</th>
                  <th className="py-3 px-2">Method</th>
                  <th className="py-3 px-2 text-right">Amount (₹)</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 px-2 text-center">Receipts</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-700 dark:text-slate-300 text-xs">
                {incomes.map((inc) => (
                  <tr key={inc._id} className="hover:bg-white/5 transition-all group">
                    <td className="py-3.5 px-2 text-[10px] font-bold text-slate-400">
                      {new Date(inc.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100">{inc.customerName}</span>
                      {inc.customerId?.companyName && (
                        <span className="block text-[8px] text-slate-450 font-bold uppercase">{inc.customerId.companyName}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-2 text-[10px] font-black text-indigo-500">{inc.invoiceNumber}</td>
                    <td className="py-3.5 px-2 text-[10px] font-bold text-slate-450">{inc.paymentMethod}</td>
                    <td className="py-3.5 px-2 text-[10px] font-black text-slate-900 dark:text-slate-100 text-right font-mono">
                      {Number(inc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider
                        ${inc.status === 'Active' ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/10' :
                          inc.status === 'Disputed' ? 'text-rose-505 bg-rose-500/5 border border-rose-500/10' :
                          'text-amber-500 bg-amber-500/5 border border-amber-500/10'}`}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      {inc.attachmentUrl ? (
                        <a
                          href={inc.attachmentUrl}
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
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal(inc)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-550 rounded-lg cursor-pointer"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(inc._id)}
                          className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {incomes.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      No incoming cash records logged
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
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-650 cursor-pointer disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={currentPage === pagination.pages}
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-650 cursor-pointer disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- ADD INCOME MODAL (Glassmorphic) --- */}
      <AnimatePresence>
        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)} title="Record Incoming Payment Outlay">
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-505 text-[10px] font-black uppercase tracking-tight rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Date *</label>
                  <input
                    type="date"
                    required
                    value={formFields.date}
                    onChange={(e) => setFormFields(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Customer / Payer *</label>
                  <select
                    required
                    value={formFields.customerId}
                    onChange={handleCustomerChange}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="">-- Select Registered Payer --</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Invoice Reference # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-001"
                    value={formFields.invoiceNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-populated if customer is chosen"
                    value={formFields.gstNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, gstNumber: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Channel *</label>
                  <select
                    value={formFields.paymentMethod}
                    onChange={(e) => setFormFields(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Digital Wallet">Digital Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Net Amount Received (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formFields.amount}
                    onChange={(e) => setFormFields(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Description/Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Additional transaction particulars..."
                  value={formFields.description}
                  onChange={(e) => setFormFields(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Receipt Invoice Upload (Max 10MB)</label>
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
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-550 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-md active:scale-95 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Record Income
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* --- EDIT INCOME MODAL (Glassmorphic) --- */}
      <AnimatePresence>
        {showEditModal && (
          <Modal onClose={() => setShowEditModal(false)} title="Update Recorded Income Ledger">
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-505 text-[10px] font-black uppercase tracking-tight rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Date *</label>
                  <input
                    type="date"
                    required
                    value={formFields.date}
                    onChange={(e) => setFormFields(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Customer / Payer *</label>
                  <select
                    required
                    value={formFields.customerId}
                    onChange={handleCustomerChange}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="">-- Choose Registered Payer --</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Invoice Reference # *</label>
                  <input
                    type="text"
                    required
                    value={formFields.invoiceNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={formFields.gstNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, gstNumber: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Channel *</label>
                  <select
                    value={formFields.paymentMethod}
                    onChange={(e) => setFormFields(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Digital Wallet">Digital Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formFields.amount}
                    onChange={(e) => setFormFields(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none"
                  />
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
                  className="w-full mt-1 text-[10px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-indigo-655/10 file:text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-555 cursor-pointer transition-all"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-800/80 backdrop-blur-md rounded-[2.5rem] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-205 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

export default IncomeManagement;