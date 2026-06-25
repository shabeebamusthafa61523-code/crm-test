import axios from 'axios';

const rawApiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;

const payrollApi = axios.create({
  baseURL: API_URL
});

payrollApi.interceptors.request.use(
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

payrollApi.interceptors.response.use(
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

// --- SALARIES ---
export const getSalaries = (params) => payrollApi.get('/payroll/salaries', { params });
export const getSalaryById = (id) => payrollApi.get(`/payroll/salaries/${id}`);
export const createSalary = (data) => payrollApi.post('/payroll/salaries/create', data);
export const updateSalary = (id, data) => payrollApi.put(`/payroll/salaries/update/${id}`, data);
export const updateSalaryWorkflow = (id, payload) => payrollApi.patch(`/payroll/salaries/${id}/workflow`, payload);
export const deleteSalary = (id) => payrollApi.delete(`/payroll/salaries/${id}`);
export const emailSalarySlip = (id) => payrollApi.post(`/payroll/salaries/${id}/send-slip`);
export const batchGenerateDrafts = (salaryMonth) => payrollApi.post('/payroll/salaries/batch-drafts', { salaryMonth });

// --- REPORTS ---
export const getMonthlySalaryReport = (salaryMonth) => payrollApi.get('/payroll/salaries/reports/monthly', { params: { salaryMonth } });
export const getEmployeeSalaryHistory = (employeeId) => payrollApi.get('/payroll/salaries/history', { params: { employeeId } });

export default {
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  updateSalaryWorkflow,
  deleteSalary,
  emailSalarySlip,
  batchGenerateDrafts,
  getMonthlySalaryReport,
  getEmployeeSalaryHistory
};
