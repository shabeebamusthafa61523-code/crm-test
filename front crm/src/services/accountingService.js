import axios from 'axios';

const rawApiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;

const accountingApi = axios.create({
  baseURL: API_URL
});

accountingApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      const cleanToken = token.replace(/"/g, '');
      config.headers.Authorization = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

accountingApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const parsedError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      statusCode: error.response?.status || 500,
      errors: error.response?.data?.errors || null
    };
    return Promise.reject(parsedError);
  }
);

// --- CUSTOMERS ---
export const getCustomers = (params) => accountingApi.get('/accounting/customers', { params });
export const getCustomerById = (id) => accountingApi.get(`/accounting/customers/${id}`);
export const createCustomer = (data) => accountingApi.post('/accounting/customers/create', data);
export const updateCustomer = (id, data) => accountingApi.put(`/accounting/customers/update/${id}`, data);
export const deleteCustomer = (id) => accountingApi.delete(`/accounting/customers/${id}`);

// --- VENDORS ---
export const getVendors = (params) => accountingApi.get('/accounting/vendors', { params });
export const getVendorById = (id) => accountingApi.get(`/accounting/vendors/${id}`);
export const createVendor = (data) => accountingApi.post('/accounting/vendors/create', data);
export const updateVendor = (id, data) => accountingApi.put(`/accounting/vendors/update/${id}`, data);
export const deleteVendor = (id) => accountingApi.delete(`/accounting/vendors/${id}`);

// --- INCOME ---
export const getIncomes = (params) => accountingApi.get('/accounting/income', { params });
export const getIncomeById = (id) => accountingApi.get(`/accounting/income/${id}`);
export const createIncome = (formData) => accountingApi.post('/accounting/income/create', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateIncome = (id, formData) => accountingApi.put(`/accounting/income/update/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteIncome = (id) => accountingApi.delete(`/accounting/income/${id}`);

// --- EXPENSES ---
export const getExpenses = (params) => accountingApi.get('/accounting/expenses', { params });
export const getExpenseById = (id) => accountingApi.get(`/accounting/expenses/${id}`);
export const createExpense = (formData) => accountingApi.post('/accounting/expenses/create', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateExpense = (id, formData) => accountingApi.put(`/accounting/expenses/update/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const approveExpense = (id, status) => accountingApi.patch(`/accounting/expenses/${id}/approve`, { status });
export const deleteExpense = (id) => accountingApi.delete(`/accounting/expenses/${id}`);

// --- PURCHASES ---
export const getPurchases = (params) => accountingApi.get('/accounting/purchases', { params });
export const getPurchaseById = (id) => accountingApi.get(`/accounting/purchases/${id}`);
export const createPurchase = (formData) => accountingApi.post('/accounting/purchases/create', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updatePurchase = (id, formData) => accountingApi.put(`/accounting/purchases/update/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updatePurchaseStatus = (id, status) => accountingApi.patch(`/accounting/purchases/${id}/status`, { status });
export const deletePurchase = (id) => accountingApi.delete(`/accounting/purchases/${id}`);

// --- INVOICES ---
export const getInvoices = (params) => accountingApi.get('/accounting/invoices', { params });
export const getInvoiceById = (id) => accountingApi.get(`/accounting/invoices/${id}`);
export const createInvoice = (data) => accountingApi.post('/accounting/invoices/create', data);
export const updateInvoice = (id, data) => accountingApi.put(`/accounting/invoices/update/${id}`, data);
export const updateInvoiceStatus = (id, payload) => accountingApi.patch(`/accounting/invoices/${id}/status`, payload);
export const deleteInvoice = (id) => accountingApi.delete(`/accounting/invoices/${id}`);
export const sendInvoiceEmail = (id) => accountingApi.post(`/accounting/invoices/${id}/send-email`);
export const getInvoiceMetrics = () => accountingApi.get('/accounting/invoices/metrics');
export const getDashboardStats = () => accountingApi.get('/accounting/dashboard/stats');

export default {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getIncomes,
  getIncomeById,
  createIncome,
  updateIncome,
  deleteIncome,
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  approveExpense,
  deleteExpense,
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  updatePurchaseStatus,
  deletePurchase,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  sendInvoiceEmail,
  getInvoiceMetrics,
  getDashboardStats
};
