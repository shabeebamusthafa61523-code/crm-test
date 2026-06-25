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
  ShoppingCart, 
  Trash, 
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight
} from 'lucide-react';
import { 
  getPurchases, 
  createPurchase, 
  updatePurchase, 
  deletePurchase, 
  updatePurchaseStatus,
  getVendors 
} from '../../services/accountingService';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const PurchaseManagement = () => {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [userRole, setUserRole] = useState('');
  
  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  
  // Form fields
  const [formFields, setFormFields] = useState({
    purchaseDate: '',
    vendorId: '',
    vendorName: '',
    gstNumber: '',
    invoiceNumber: '',
    description: '',
    status: 'Draft'
  });
  const [lineItems, setLineItems] = useState([
    { productName: '', quantity: 1, unitPrice: 0, taxAmount: 0 }
  ]);
  const [fileAttachment, setFileAttachment] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUserRole(String(u.role_id || u.roleId || u.role || '').toLowerCase().trim());
    }
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [currentPage, search, status, vendorId, startDate, endDate]);

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

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 25,
        search,
        status,
        vendorId,
        startDate,
        endDate
      };
      const res = await getPurchases(params);
      if (res.success) {
        setPurchases(res.data.purchases || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setVendorId('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Line Items handling
  const handleAddLineItem = () => {
    setLineItems(prev => [...prev, { productName: '', quantity: 1, unitPrice: 0, taxAmount: 0 }]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index, field, value) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      
      // Auto-calculate taxAmount at 18% GST standard on change of price/qty
      if (field === 'unitPrice' || field === 'quantity') {
        const qty = field === 'quantity' ? Number(value) : Number(item.quantity);
        const price = field === 'unitPrice' ? Number(value) : Number(item.unitPrice);
        updated.taxAmount = Number(((qty * price * 0.18)).toFixed(2));
      }
      return updated;
    }));
  };

  const grandTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const tax = Number(item.taxAmount) || 0;
      return sum + (qty * price) + tax;
    }, 0);
  }, [lineItems]);

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
      purchaseDate: new Date().toISOString().split('T')[0],
      vendorId: '',
      vendorName: '',
      gstNumber: '',
      invoiceNumber: '',
      description: '',
      status: 'Draft'
    });
    setLineItems([{ productName: '', quantity: 1, unitPrice: 0, taxAmount: 0 }]);
    setFileAttachment(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (record) => {
    setCurrentRecord(record);
    const dateFormatted = record.purchaseDate ? new Date(record.purchaseDate).toISOString().split('T')[0] : '';
    setFormFields({
      purchaseDate: dateFormatted,
      vendorId: record.vendorId?._id || record.vendorId || '',
      vendorName: record.vendorName,
      gstNumber: record.gstNumber || '',
      invoiceNumber: record.invoiceNumber,
      description: record.description || '',
      status: record.status
    });
    setLineItems(record.items || [{ productName: '', quantity: 1, unitPrice: 0, taxAmount: 0 }]);
    setFileAttachment(null);
    setFormError('');
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formFields.vendorId || !formFields.invoiceNumber) {
      setFormError('Please fill in all required fields (Vendor, Invoice).');
      return;
    }

    const hasEmptyItem = lineItems.some(item => !item.productName || item.unitPrice <= 0);
    if (hasEmptyItem) {
      setFormError('Please check all items: description and unit price must be entered.');
      return;
    }

    const fd = new FormData();
    Object.entries(formFields).forEach(([k, v]) => {
      fd.append(k, v);
    });
    fd.append('items', JSON.stringify(lineItems));
    
    if (fileAttachment) {
      fd.append('attachment', fileAttachment);
    }

    try {
      const res = await createPurchase(fd);
      if (res.success) {
        setShowAddModal(false);
        fetchPurchases();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formFields.vendorId || !formFields.invoiceNumber) {
      setFormError('Please fill in all required fields (Vendor, Invoice).');
      return;
    }

    const hasEmptyItem = lineItems.some(item => !item.productName || item.unitPrice <= 0);
    if (hasEmptyItem) {
      setFormError('Please check all items: description and unit price must be entered.');
      return;
    }

    const fd = new FormData();
    Object.entries(formFields).forEach(([k, v]) => {
      fd.append(k, v);
    });
    fd.append('items', JSON.stringify(lineItems));

    if (fileAttachment) {
      fd.append('attachment', fileAttachment);
    }

    try {
      const res = await updatePurchase(currentRecord._id, fd);
      if (res.success) {
        setShowEditModal(false);
        fetchPurchases();
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleUpdateStatus = async (id, targetStatus) => {
    try {
      const res = await updatePurchaseStatus(id, targetStatus);
      if (res.success) {
        fetchPurchases();
      }
    } catch (err) {
      alert(err.message || 'Failed to progress status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return;
    try {
      const res = await deletePurchase(id);
      if (res.success) {
        fetchPurchases();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete purchase order');
    }
  };

  // --- CLIENT SIDE EXPORTS ---
  const exportToExcel = () => {
    const headers = [['Purchase ID', 'Date', 'Vendor Name', 'GSTIN', 'Invoice #', 'Total Amount (₹)', 'Status', 'Description']];
    const data = purchases.map(pur => [
      pur._id,
      new Date(pur.purchaseDate).toLocaleDateString('en-IN'),
      pur.vendorName,
      pur.gstNumber || 'N/A',
      pur.invoiceNumber,
      pur.totalAmount,
      pur.status,
      pur.description || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, `Purchase_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.text('CORPORATE PROCUREMENT ORDERS SUMMARY', 14, 15);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

    const data = purchases.map((pur, i) => [
      i + 1,
      new Date(pur.purchaseDate).toLocaleDateString('en-IN'),
      pur.vendorName,
      pur.invoiceNumber,
      `INR ${Number(pur.totalAmount).toFixed(2)}`,
      pur.status
    ]);

    doc.autoTable({
      startY: 25,
      head: [['SI', 'Date', 'Vendor', 'Invoice #', 'Total Cost', 'Status']],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [48, 86, 120] }
    });

    doc.save(`Purchase_Orders_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-[2rem] p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
            Procurement & Purchase Orders
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Manage corporate inventory purchases and vendor ledgers</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 border rounded-2xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95
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
            className="p-2.5 bg-emerald-600/5 hover:bg-emerald-600/10 border border-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </button>

          <button
            onClick={exportToPDF}
            className="p-2.5 bg-rose-600/5 hover:bg-rose-600/10 border border-rose-500/10 rounded-2xl text-rose-600 dark:text-rose-450 transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
          >
            <FileText size={14} />
            <span>PDF</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="p-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
          >
            <Plus size={14} />
            <span>New PO</span>
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
            className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Search</label>
                <div className="relative mt-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Invoice # or Vendor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Vendor</label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] focus:outline-none"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
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
                  <option value="Draft">Draft</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Received">Received (GRN)</option>
                  <option value="Invoiced">Invoiced</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Dates</label>
                <div className="flex gap-1 items-center mt-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px]"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px]"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleResetFilters}
                  className="w-full py-2 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="py-20 flex justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-150 dark:border-slate-800/80 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <th className="pb-3 pr-2">Date</th>
                <th className="pb-3 pr-2">Supplier Vendor</th>
                <th className="pb-3 pr-2">Invoice #</th>
                <th className="pb-3 pr-2">Items Count</th>
                <th className="pb-3 pr-2 text-right">Grand Total</th>
                <th className="pb-3 pr-2 text-center">Status</th>
                <th className="pb-3 pr-2 text-center">Attachment</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((pur) => (
                <tr key={pur._id} className="border-b border-slate-50 dark:border-slate-800/20 last:border-none group">
                  <td className="py-3.5 pr-2 text-[10px] font-bold text-slate-550">
                    {new Date(pur.purchaseDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3.5 pr-2">
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100">{pur.vendorName}</span>
                    {pur.vendorId?.companyName && (
                      <span className="block text-[8px] text-slate-400 font-bold uppercase">{pur.vendorId.companyName}</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-2 text-[10px] font-black text-indigo-500">{pur.invoiceNumber}</td>
                  <td className="py-3.5 pr-2 text-[10px] font-bold text-slate-450">{pur.items?.length || 0} Units</td>
                  <td className="py-3.5 pr-2 text-[10px] font-black text-slate-800 dark:text-slate-100 text-right">
                    ₹{Number(pur.totalAmount).toFixed(2)}
                  </td>
                  <td className="py-3.5 pr-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1
                      ${pur.status === 'Paid' ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/10' :
                        pur.status === 'Received' ? 'text-cyan-500 bg-cyan-500/5 border border-cyan-500/10' :
                        pur.status === 'Confirmed' ? 'text-indigo-500 bg-indigo-500/5 border border-indigo-500/10' :
                        'text-slate-400 bg-slate-500/5'}`}
                    >
                      {pur.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-2 text-center">
                    {pur.attachmentUrl ? (
                      <a
                        href={pur.attachmentUrl}
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
                      {/* State transitions buttons */}
                      {isPrivileged && pur.status === 'Draft' && (
                        <button
                          onClick={() => handleUpdateStatus(pur._id, 'Confirmed')}
                          className="px-2 py-1 bg-indigo-650 text-white text-[8px] font-black uppercase tracking-wider rounded-lg active:scale-95 mr-2"
                        >
                          Confirm Order
                        </button>
                      )}
                      {isPrivileged && pur.status === 'Confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(pur._id, 'Received')}
                          className="px-2 py-1 bg-cyan-650 text-white text-[8px] font-black uppercase tracking-wider rounded-lg active:scale-95 mr-2 inline-flex items-center gap-0.5"
                        >
                          <Truck size={10} />
                          <span>Receive Goods</span>
                        </button>
                      )}
                      {isPrivileged && pur.status === 'Received' && (
                        <button
                          onClick={() => handleUpdateStatus(pur._id, 'Invoiced')}
                          className="px-2 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider rounded-lg active:scale-95 mr-2"
                        >
                          Invoice PO
                        </button>
                      )}
                      {isPrivileged && pur.status === 'Invoiced' && (
                        <button
                          onClick={() => handleUpdateStatus(pur._id, 'Paid')}
                          className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider rounded-lg active:scale-95 mr-2"
                        >
                          Pay
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {['Draft', 'Confirmed'].includes(pur.status) && (
                          <button
                            onClick={() => handleOpenEditModal(pur)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-lg"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(pur._id)}
                          className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    No procurement records logged
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Showing page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              disabled={currentPage === pagination.pages}
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* --- ADD PURCHASE ORDER MODAL --- */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Purchase Order">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-tight rounded-xl flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Purchase Date *</label>
              <input
                type="date"
                required
                value={formFields.purchaseDate}
                onChange={(e) => setFormFields(prev => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Supplier/Vendor *</label>
              <select
                required
                value={formFields.vendorId}
                onChange={handleVendorChange}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              >
                <option value="">Select Vendor...</option>
                {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Invoice Reference # *</label>
              <input
                type="text"
                required
                placeholder="e.g. PO-REF-2026"
                value={formFields.invoiceNumber}
                onChange={(e) => setFormFields(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">GSTIN Number</label>
              <input
                type="text"
                placeholder="Supplier GST (Auto-filled)"
                value={formFields.gstNumber}
                onChange={(e) => setFormFields(prev => ({ ...prev, gstNumber: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Line Items Dynamic Grid */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Purchase Line Items</span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-600 text-[9px] font-black uppercase rounded-lg transition-all"
              >
                Add Line
              </button>
            </div>

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-3 items-end bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-150 dark:border-slate-850 relative group">
                  <div className="flex-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Product Name / Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="Product Details..."
                      value={item.productName}
                      onChange={(e) => handleLineItemChange(index, 'productName', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    />
                  </div>

                  <div className="w-16">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Qty *</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-right"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-right"
                    />
                  </div>

                  <div className="w-20">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">GST Tax (₹18%)</label>
                    <div className="w-full mt-1 px-2 py-1.5 bg-slate-100 dark:bg-slate-850 rounded-lg text-xs text-right text-slate-500">
                      ₹{item.taxAmount}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg disabled:opacity-20 transition-all shrink-0 mb-1"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end p-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-slate-500 mr-4">Estimated Grand Total:</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Purchase Remarks</label>
            <textarea
              rows="2"
              placeholder="Vendor lead times, payment terms or delivery constraints..."
              value={formFields.description}
              onChange={(e) => setFormFields(prev => ({ ...prev, description: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Attach PO Invoice (Max 10MB)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFileAttachment(e.target.files[0])}
              className="w-full mt-1 text-[10px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:bg-indigo-600/10 file:text-indigo-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-550"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-md text-[10px] font-black uppercase tracking-wider"
            >
              File PO Order
            </button>
          </div>
        </form>
      </Modal>

      {/* --- EDIT PURCHASE ORDER MODAL --- */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} title="Update Purchase Order Detail">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-tight rounded-xl flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Purchase Date *</label>
              <input
                type="date"
                required
                value={formFields.purchaseDate}
                onChange={(e) => setFormFields(prev => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Supplier/Vendor *</label>
              <select
                required
                value={formFields.vendorId}
                onChange={handleVendorChange}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              >
                <option value="">Select Vendor...</option>
                {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
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
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">GSTIN Number</label>
              <input
                type="text"
                value={formFields.gstNumber}
                onChange={(e) => setFormFields(prev => ({ ...prev, gstNumber: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Line Items Dynamic Grid */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Purchase Line Items</span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-600 text-[9px] font-black uppercase rounded-lg transition-all"
              >
                Add Line
              </button>
            </div>

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-3 items-end bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-150 dark:border-slate-850 relative group">
                  <div className="flex-1">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Product Name / Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="Product Details..."
                      value={item.productName}
                      onChange={(e) => handleLineItemChange(index, 'productName', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    />
                  </div>

                  <div className="w-16">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Qty *</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-right"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-right"
                    />
                  </div>

                  <div className="w-20">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">GST Tax (₹18%)</label>
                    <div className="w-full mt-1 px-2 py-1.5 bg-slate-100 dark:bg-slate-850 rounded-lg text-xs text-right text-slate-555">
                      ₹{item.taxAmount}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg disabled:opacity-20 transition-all shrink-0 mb-1"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end p-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-slate-500 mr-4">Estimated Grand Total:</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Purchase Remarks</label>
            <textarea
              rows="2"
              value={formFields.description}
              onChange={(e) => setFormFields(prev => ({ ...prev, description: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Update Receipt document</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFileAttachment(e.target.files[0])}
              className="w-full mt-1 text-[10px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:bg-indigo-600/10 file:text-indigo-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-550"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-md text-[10px] font-black uppercase tracking-wider"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

export default PurchaseManagement;
