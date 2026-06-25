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
  Mail, 
  Calendar,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Check,
  Ban,
  ChevronRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { 
  getInvoices, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice, 
  updateInvoiceStatus, 
  sendInvoiceEmail, 
  getInvoiceMetrics, 
  getCustomers 
} from '../../services/accountingService';
import axios from 'axios';
import * as XLSX from 'xlsx';

const rawApiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;

const InvoiceManagement = () => {
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  
  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [toast, setToast] = useState(null);
  
  // Form fields
  const [formFields, setFormFields] = useState({
    invoiceNumber: '',
    customerId: '',
    customerName: '',
    gstNumber: '',
    invoiceDate: '',
    dueDate: '',
    notes: '',
    status: 'Draft',
    items: []
  });
  
  // Form Line Item Fields
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unitPrice: '',
    taxAmount: 0
  });

  // Mark as Paid form fields
  const [paidFields, setPaidFields] = useState({
    paymentDate: '',
    paymentReference: ''
  });

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

  const fetchMetrics = async () => {
    try {
      const res = await getInvoiceMetrics();
      if (res.success) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error('Failed to load invoice metrics:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 25,
        search,
        status,
        customerId,
        startDate,
        endDate
      };
      const res = await getInvoices(params);
      if (res.success) {
        setInvoices(res.data.invoices || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to retrieve invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, search, status, customerId, startDate, endDate]);

  const showToastMsg = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setCustomerId('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Generate automated invoice sequence number
  const generateInvoiceNumber = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `INV-${new Date().getFullYear()}-${rand}`;
  };

  const handleOpenAddModal = () => {
    setFormFields({
      invoiceNumber: generateInvoiceNumber(),
      customerId: '',
      customerName: '',
      gstNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 days
      notes: '',
      status: 'Draft',
      items: []
    });
    setNewItem({
      description: '',
      quantity: 1,
      unitPrice: '',
      taxAmount: 0
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (record) => {
    setCurrentRecord(record);
    const dateFormatted = record.invoiceDate ? new Date(record.invoiceDate).toISOString().split('T')[0] : '';
    const dueDateFormatted = record.dueDate ? new Date(record.dueDate).toISOString().split('T')[0] : '';
    
    setFormFields({
      invoiceNumber: record.invoiceNumber,
      customerId: record.customerId?._id || record.customerId || '',
      customerName: record.customerName,
      gstNumber: record.gstNumber || '',
      invoiceDate: dateFormatted,
      dueDate: dueDateFormatted,
      notes: record.notes || '',
      status: record.status,
      items: record.items ? record.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxAmount: item.taxAmount
      })) : []
    });
    setNewItem({
      description: '',
      quantity: 1,
      unitPrice: '',
      taxAmount: 0
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleCustomerChangeInForm = (custVal) => {
    if (!custVal) {
      setFormFields(prev => ({ ...prev, customerId: '', customerName: '', gstNumber: '' }));
      return;
    }
    const found = customers.find(c => c._id === custVal);
    if (found) {
      setFormFields(prev => ({
        ...prev,
        customerId: found._id,
        customerName: found.name,
        gstNumber: found.gstNumber || ''
      }));
    }
  };

  // Line Item actions
  const handleAddItem = () => {
    if (!newItem.description.trim()) {
      setFormError('Please enter item description');
      return;
    }
    if (!newItem.unitPrice || parseFloat(newItem.unitPrice) <= 0) {
      setFormError('Please enter a valid unit price greater than 0');
      return;
    }
    const qty = parseInt(newItem.quantity) || 1;
    const price = parseFloat(newItem.unitPrice) || 0;
    
    // Auto-calculate tax if GST is 18% standard, let's allow tax overrides
    const calculatedTax = Number((qty * price * 0.18).toFixed(2));

    const item = {
      description: newItem.description,
      quantity: qty,
      unitPrice: price,
      taxAmount: newItem.taxAmount !== undefined && newItem.taxAmount !== '' ? parseFloat(newItem.taxAmount) : calculatedTax
    };

    setFormFields(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    // Reset item input fields
    setNewItem({
      description: '',
      quantity: 1,
      unitPrice: '',
      taxAmount: 0
    });
    setFormError('');
  };

  const handleRemoveItem = (index) => {
    setFormFields(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  // Calculate Running Form Totals
  const formTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    formFields.items.forEach(it => {
      subtotal += it.quantity * it.unitPrice;
      tax += it.taxAmount || 0;
    });
    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      grandTotal: Number((subtotal + tax).toFixed(2))
    };
  }, [formFields.items]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formFields.customerId) {
      setFormError('Please select a customer');
      return;
    }
    if (formFields.items.length === 0) {
      setFormError('Please add at least one line item');
      return;
    }

    try {
      const payload = {
        ...formFields,
        items: JSON.stringify(formFields.items)
      };
      
      const res = await createInvoice(payload);
      if (res.success) {
        showToastMsg('Invoice generated successfully');
        setShowAddModal(false);
        fetchInvoices();
        fetchMetrics();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formFields.customerId) {
      setFormError('Please select a customer');
      return;
    }
    if (formFields.items.length === 0) {
      setFormError('Please add at least one line item');
      return;
    }

    try {
      const payload = {
        ...formFields,
        items: JSON.stringify(formFields.items)
      };
      
      const res = await updateInvoice(currentRecord._id, payload);
      if (res.success) {
        showToastMsg('Invoice updated successfully');
        setShowEditModal(false);
        fetchInvoices();
        fetchMetrics();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to cancel and delete this invoice?')) return;
    try {
      const res = await deleteInvoice(id);
      if (res.success) {
        showToastMsg('Invoice deleted/cancelled successfully');
        fetchInvoices();
        fetchMetrics();
      }
    } catch (err) {
      showToastMsg(err.message || 'Deletion failed', 'error');
    }
  };

  // Download PDF file
  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      showToastMsg(`Downloading PDF for invoice #${invoiceNumber}...`);
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/"/g, '') : '';
      const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;

      const response = await axios.get(`${API_URL}/accounting/invoices/${invoiceId}/download`, {
        headers: { Authorization: authHeader },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToastMsg('Download completed');
    } catch (err) {
      showToastMsg(err.message || 'Failed to download invoice PDF', 'error');
    }
  };

  // Dispatch Email
  const handleSendEmail = async (id, invoiceNumber) => {
    try {
      showToastMsg(`Sending invoice #${invoiceNumber} to customer...`);
      const res = await sendInvoiceEmail(id);
      if (res.success) {
        showToastMsg(`Invoice #${invoiceNumber} sent successfully!`);
        fetchInvoices();
      }
    } catch (err) {
      showToastMsg(err.message || 'Failed to send email reminder', 'error');
    }
  };

  // Open Mark as Paid modal
  const handleOpenPaidModal = (record) => {
    setCurrentRecord(record);
    setPaidFields({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentReference: ''
    });
    setFormError('');
    setShowPaidModal(true);
  };

  const handlePaidSubmit = async (e) => {
    e.preventDefault();
    if (!paidFields.paymentDate) {
      setFormError('Please enter payment date');
      return;
    }
    try {
      const res = await updateInvoiceStatus(currentRecord._id, {
        status: 'Paid',
        paymentDate: paidFields.paymentDate,
        paymentReference: paidFields.paymentReference
      });
      if (res.success) {
        showToastMsg('Invoice payment recorded');
        setShowPaidModal(false);
        fetchInvoices();
        fetchMetrics();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update status');
    }
  };

  const handleMarkStatus = async (id, statusVal) => {
    if (statusVal === 'Paid') {
      const rec = invoices.find(inv => inv._id === id);
      handleOpenPaidModal(rec);
      return;
    }

    if (!window.confirm(`Are you sure you want to mark this invoice as ${statusVal}?`)) return;
    try {
      const res = await updateInvoiceStatus(id, { status: statusVal });
      if (res.success) {
        showToastMsg(`Invoice marked as ${statusVal}`);
        fetchInvoices();
        fetchMetrics();
      }
    } catch (err) {
      showToastMsg(err.message || 'Operation failed', 'error');
    }
  };

  // Export to Excel sheet
  const handleExportExcel = () => {
    const headers = [
      'Invoice #', 'Customer Name', 'GST Number', 'Invoice Date', 'Due Date', 
      'Subtotal (₹)', 'Tax (₹)', 'Grand Total (₹)', 'Status', 'Payment Ref', 'Payment Date'
    ];
    const data = invoices.map(i => [
      i.invoiceNumber,
      i.customerName,
      i.gstNumber || 'N/A',
      new Date(i.invoiceDate).toLocaleDateString('en-IN'),
      new Date(i.dueDate).toLocaleDateString('en-IN'),
      i.amount,
      i.tax,
      i.grandTotal,
      i.status,
      i.paymentReference || 'N/A',
      i.paymentDate ? new Date(i.paymentDate).toLocaleDateString('en-IN') : 'N/A'
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices Ledger');
    XLSX.writeFile(workbook, `Invoices_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToastMsg('Excel spreadsheet exported successfully');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. AGING & DSO METRICS RIBBON */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-28">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Days Sales Outstanding</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-white">{metrics.dso}</span>
              <span className="text-[10px] font-semibold text-slate-400">days avg</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full" 
                style={{ width: `${Math.min(100, (parseFloat(metrics.dso) / 90) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-28">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">0 - 30 Days Aging</span>
              <span className="text-[10px] font-bold text-indigo-400">{metrics.aging?.days30?.count || 0} bills</span>
            </div>
            <span className="text-2xl font-black text-white">₹{(metrics.aging?.days30?.amount || 0).toLocaleString('en-IN')}</span>
            <span className="text-[9px] text-slate-400">Current Outstanding Receivable</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-28">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">31 - 60 Days Aging</span>
              <span className="text-[10px] font-bold text-amber-400">{metrics.aging?.days60?.count || 0} bills</span>
            </div>
            <span className="text-2xl font-black text-white">₹{(metrics.aging?.days60?.amount || 0).toLocaleString('en-IN')}</span>
            <span className="text-[9px] text-slate-400">Short-term Overdue Ledger</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-28">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">61 - 90 Days Aging</span>
              <span className="text-[10px] font-bold text-rose-400">{metrics.aging?.days90?.count || 0} bills</span>
            </div>
            <span className="text-2xl font-black text-white">₹{(metrics.aging?.days90?.amount || 0).toLocaleString('en-IN')}</span>
            <span className="text-[9px] text-slate-400">Medium-term Accounts Pending</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between h-28">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">90+ Days Aging</span>
              <span className="text-[10px] font-bold text-rose-600">{metrics.aging?.days90Plus?.count || 0} bills</span>
            </div>
            <span className="text-2xl font-black text-white">₹{(metrics.aging?.days90Plus?.amount || 0).toLocaleString('en-IN')}</span>
            <span className="text-[9px] text-slate-400">Critical Bad-Debt Warnings</span>
          </div>
        </div>
      )}

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

      {/* 2. TABLE HEAD ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md p-4 rounded-3xl">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search Invoice # or Company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-semibold
              ${showFilters 
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' 
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'
              }`}
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-2xl"
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-600/10"
          >
            <Plus size={14} />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC COLLAPSIBLE FILTERS PANEL */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Customers</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Invoice Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">End Date</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button 
                    onClick={handleResetFilters}
                    className="px-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. DATA WORK TABLE */}
      <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-800/60 text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                <th className="py-4 px-6">Invoice #</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Issued / Due</th>
                <th className="py-4 px-6 text-right">Subtotal</th>
                <th className="py-4 px-6 text-right">Tax (18%)</th>
                <th className="py-4 px-6 text-right">Grand Total</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Email</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"
                      />
                      <span>Retrieving invoices database ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No matching invoices found in database.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusColors = {
                    Draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                    Pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                    Paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                    Overdue: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                    Cancelled: 'bg-slate-800/40 text-slate-600 border-slate-800/60 strike'
                  };

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/20 transition-all">
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold">{inv.customerName}</div>
                        {inv.gstNumber && <span className="text-[10px] text-slate-400 block font-mono">GST: {inv.gstNumber}</span>}
                      </td>
                      <td className="py-4 px-6 space-y-0.5">
                        <span className="text-slate-400 block text-[10px]">
                          Issued: {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </span>
                        <span className="font-semibold block text-[10px] text-indigo-400">
                          Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold">
                        ₹{Number(inv.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-400">
                        ₹{Number(inv.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-900 dark:text-white">
                        ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColors[inv.status] || ''}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {inv.emailSent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                            <Check size={12} /> Dispatched
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Not Sent</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownloadPDF(inv._id, inv.invoiceNumber)}
                            title="Download PDF Invoice"
                            className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 transition-colors"
                          >
                            <Download size={13} />
                          </button>
                          
                          <button
                            onClick={() => handleSendEmail(inv._id, inv.invoiceNumber)}
                            title="Dispatch Invoice Email"
                            className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 transition-colors"
                          >
                            <Mail size={13} />
                          </button>

                          {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                            <>
                              <button
                                onClick={() => handleMarkStatus(inv._id, 'Paid')}
                                title="Mark as Settled/Paid"
                                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                              >
                                <Check size={13} />
                              </button>
                              
                              <button
                                onClick={() => handleOpenEditModal(inv)}
                                title="Edit invoice items"
                                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                              >
                                <Edit3 size={13} />
                              </button>
                            </>
                          )}

                          {inv.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleDeleteRecord(inv._id)}
                              title="Cancel / Void Invoice"
                              className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                            >
                              <Ban size={13} />
                            </button>
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

        {/* PAGINATION CONTROLLER */}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200/50 dark:border-slate-800/50">
            <span className="text-[10px] text-slate-400">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} records)
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 text-[10px]"
              >
                Previous
              </button>
              <button
                disabled={currentPage === pagination.pages}
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 text-[10px]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. MODALS (ADD, EDIT, PAID) */}
      {/* ======================================================== */}
      
      {/* CREATE INVOICE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Create Tax Invoice</h3>
                <p className="text-[10px] text-slate-400">Add client items details and generate PDF billing statements</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-6">
              
              {formError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid block header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={formFields.invoiceNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Customer</label>
                  <select
                    required
                    value={formFields.customerId}
                    onChange={(e) => handleCustomerChangeInForm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client GSTIN</label>
                  <input
                    type="text"
                    value={formFields.gstNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, gstNumber: e.target.value }))}
                    placeholder="27AAAAA1111A1Z1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={formFields.invoiceDate}
                    onChange={(e) => setFormFields(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formFields.dueDate}
                    onChange={(e) => setFormFields(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Status</label>
                  <select
                    value={formFields.status}
                    onChange={(e) => setFormFields(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending (Issued)</option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC ITEM LIST BUILDER */}
              <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-2">
                  Line Items (India GST 18% Applicable)
                </span>

                {/* Add Item inputs line */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">Item Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Website development retainer / Design services"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs text-center"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">Unit Price (₹)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs text-right font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Items preview table */}
                {formFields.items.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-2.5 px-3 text-left">Description</th>
                          <th className="py-2.5 px-3 text-center w-16">Qty</th>
                          <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                          <th className="py-2.5 px-3 text-right w-24">GST (18%)</th>
                          <th className="py-2.5 px-3 text-right w-28">Amount</th>
                          <th className="py-2.5 px-3 text-center w-12">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                        {formFields.items.map((item, index) => {
                          const subTotal = item.quantity * item.unitPrice;
                          const total = subTotal + item.taxAmount;
                          return (
                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="py-2 px-3">{item.description}</td>
                              <td className="py-2 px-3 text-center">{item.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono">₹{item.unitPrice.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-slate-400 font-mono">₹{item.taxAmount.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-bold font-mono">₹{total.toFixed(2)}</td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bottom calculations & details summary */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <div className="md:col-span-8 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Terms & Notes</label>
                  <textarea
                    rows="3"
                    placeholder="Enter banking information, wire details, terms and conditions here..."
                    value={formFields.notes}
                    onChange={(e) => setFormFields(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{formTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Calculated GST (18%):</span>
                    <span className="font-mono">₹{formTotals.tax.toFixed(2)}</span>
                  </div>
                  <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />
                  <div className="flex justify-between text-slate-800 dark:text-white font-black text-sm">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{formTotals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold rounded-2xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md"
                >
                  Generate Invoice
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT INVOICE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 text-indigo-400">
                  Edit Invoice #{formFields.invoiceNumber}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">Update items billing sheets records</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              
              {formError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Number</label>
                  <input
                    type="text"
                    disabled
                    value={formFields.invoiceNumber}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-400 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Customer</label>
                  <select
                    required
                    value={formFields.customerId}
                    onChange={(e) => handleCustomerChangeInForm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client GSTIN</label>
                  <input
                    type="text"
                    value={formFields.gstNumber}
                    onChange={(e) => setFormFields(prev => ({ ...prev, gstNumber: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={formFields.invoiceDate}
                    onChange={(e) => setFormFields(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formFields.dueDate}
                    onChange={(e) => setFormFields(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Status</label>
                  <select
                    value={formFields.status}
                    onChange={(e) => setFormFields(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending (Issued)</option>
                  </select>
                </div>
              </div>

              {/* EDITING ITEM LIST BUILDER */}
              <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-2">
                  Line Items (India GST 18% Applicable)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">Item Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Website development retainer"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs text-center"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">Unit Price (₹)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs text-right font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {formFields.items.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-2.5 px-3 text-left">Description</th>
                          <th className="py-2.5 px-3 text-center w-16">Qty</th>
                          <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                          <th className="py-2.5 px-3 text-right w-24">GST (18%)</th>
                          <th className="py-2.5 px-3 text-right w-28">Amount</th>
                          <th className="py-2.5 px-3 text-center w-12">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                        {formFields.items.map((item, index) => {
                          const subTotal = item.quantity * item.unitPrice;
                          const total = subTotal + item.taxAmount;
                          return (
                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="py-2 px-3">{item.description}</td>
                              <td className="py-2 px-3 text-center">{item.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono">₹{item.unitPrice.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-slate-400 font-mono">₹{item.taxAmount.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-bold font-mono">₹{total.toFixed(2)}</td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <div className="md:col-span-8 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Terms & Notes</label>
                  <textarea
                    rows="3"
                    value={formFields.notes}
                    onChange={(e) => setFormFields(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  />
                </div>

                <div className="md:col-span-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{formTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Calculated GST (18%):</span>
                    <span className="font-mono">₹{formTotals.tax.toFixed(2)}</span>
                  </div>
                  <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />
                  <div className="flex justify-between text-slate-800 dark:text-white font-black text-sm">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{formTotals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-semibold rounded-2xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MARK AS PAID / RECORD TRANSACTION MODAL */}
      {showPaidModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Record Settlement Payment
                </h3>
                <span className="text-[10px] text-slate-400">Invoice: #{currentRecord?.invoiceNumber} (₹{currentRecord?.grandTotal?.toFixed(2)})</span>
              </div>
              <button onClick={() => setShowPaidModal(false)} className="p-1 rounded-lg text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePaidSubmit} className="p-5 space-y-4">
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
                  value={paidFields.paymentDate}
                  onChange={(e) => setPaidFields(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction ID / Bank Reference</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-98402914-IMPS / UPI Reference"
                  value={paidFields.paymentReference}
                  onChange={(e) => setPaidFields(prev => ({ ...prev, paymentReference: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setShowPaidModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md"
                >
                  Mark as Paid
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default InvoiceManagement;
