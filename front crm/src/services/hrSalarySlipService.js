import axios from 'axios';

const rawApiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;

const hrSalarySlipApi = axios.create({
  baseURL: API_URL
});

hrSalarySlipApi.interceptors.request.use(
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

hrSalarySlipApi.interceptors.response.use(
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

export const getSalarySlips = (params) => hrSalarySlipApi.get('/hr/salary-slips', { params });
export const getSalarySlipById = (id) => hrSalarySlipApi.get(`/hr/salary-slips/${id}`);
export const createSalarySlip = (data) => hrSalarySlipApi.post('/hr/salary-slips', data);
export const updateSalarySlip = (id, data) => hrSalarySlipApi.put(`/hr/salary-slips/${id}`, data);
export const publishSalarySlip = (id) => hrSalarySlipApi.put(`/hr/salary-slips/${id}/publish`);
export const emailSalarySlip = (id) => hrSalarySlipApi.post(`/hr/salary-slips/${id}/send-email`);
export const deleteSalarySlip = (id) => hrSalarySlipApi.delete(`/hr/salary-slips/${id}`);

export default {
  getSalarySlips,
  getSalarySlipById,
  createSalarySlip,
  updateSalarySlip,
  publishSalarySlip,
  emailSalarySlip,
  deleteSalarySlip
};
