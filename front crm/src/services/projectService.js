import axios from 'axios';

const API_BASE = '/api/v1/projects';

const getAuthHeaders = () => {
  let token = localStorage.getItem('token') || '';
  token = token.replace(/^"(.*)"$/, '$1').trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
};

export const getProjects = async (params = {}) => {
  const response = await axios.get(API_BASE, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const getProjectById = async (id) => {
  const response = await axios.get(`${API_BASE}/${id}`, getAuthHeaders());
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await axios.post(API_BASE, projectData, getAuthHeaders());
  return response.data;
};

export const updateProject = async (id, projectData) => {
  const response = await axios.put(`${API_BASE}/${id}`, projectData, getAuthHeaders());
  return response.data;
};

export const updateProjectStatus = async (id, statusData) => {
  const response = await axios.patch(`${API_BASE}/${id}/status`, statusData, getAuthHeaders());
  return response.data;
};

export const assignProjectWork = async (id, assignmentData) => {
  const response = await axios.post(`${API_BASE}/${id}/assign`, assignmentData, getAuthHeaders());
  return response.data;
};

export const getVisibleWork = async (id) => {
  const response = await axios.get(`${API_BASE}/${id}/visible-work`, getAuthHeaders());
  return response.data;
};

export const getProjectReports = async () => {
  const response = await axios.get(`${API_BASE}/reports`, getAuthHeaders());
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await axios.delete(`${API_BASE}/${id}`, getAuthHeaders());
  return response.data;
};

export const fetchActiveEmployees = async (params = {}) => {
  const response = await axios.get('/api/user', {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};
