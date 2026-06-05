// src/services/departmentService.js

import axios from 'axios';

// Get base URL from environment or default to local development port
const API_URL = import.meta.env?.VITE_API_URL || import.meta.env?.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Create dedicated Axios instance for departments
const departmentApi = axios.create({
  baseURL: `${API_URL}/v1/departments`,
});

// Request interceptor to automatically attach authorization header
departmentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to extract `{ success, message, data }` response shape
departmentApi.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Standardize error formats for forms and alerts
    const parsedError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      statusCode: error.response?.status || 500,
      errors: error.response?.data?.data || null // For field-level validation errors
    };
    return Promise.reject(parsedError);
  }
);

// Named exports for all API endpoints

/**
 * Fetch all departments
 * @param {Object} params - Query params (?status=true|false&search=name|code)
 */
export const getAllDepartments = (params) => {
  return departmentApi.get('/', { params });
};

/**
 * Get single department details
 * @param {String} id - Department ID
 */
export const getDepartmentById = (id) => {
  return departmentApi.get(`/${id}`);
};

/**
 * Create a new department
 * @param {Object} data - { name, code, description, managerId, status }
 */
export const createDepartment = (data) => {
  return departmentApi.post('/create', data);
};

/**
 * Update existing department
 * @param {Object} data - { id, name, code, description, managerId, status }
 */
export const updateDepartment = (data) => {
  return departmentApi.put('/update', data);
};

/**
 * Delete a department
 * @param {String} id - Department ID
 */
export const deleteDepartment = (id) => {
  return departmentApi.delete(`/${id}`);
};

/**
 * Assign department manager
 * @param {String} id - Department ID
 * @param {String} managerId - User ID of manager
 */
export const assignManager = (id, managerId) => {
  return departmentApi.put(`/${id}/manager`, { managerId });
};

/**
 * Fetch users in department
 * @param {String} id - Department ID
 */
export const getDepartmentUsers = (id) => {
  return departmentApi.get(`/${id}/users`);
};

/**
 * Toggle department status
 * @param {String} id - Department ID
 * @param {Boolean} status - Target status (true = active, false = inactive)
 */
export const updateDepartmentStatus = (id, status) => {
  return departmentApi.patch(`/${id}/status`, { status });
};

/**
 * Fetch department analytics
 * @param {String} id - Department ID
 */
export const getDepartmentAnalytics = (id) => {
  return departmentApi.get(`/${id}/analytics`);
};

export default {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignManager,
  getDepartmentUsers,
  updateDepartmentStatus,
  getDepartmentAnalytics,
};
