import axios from 'axios';

const API_BASE = '/api/v1/clients';

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

export const getClients = async (params = {}) => {
  const response = await axios.get(API_BASE, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const getClientById = async (id) => {
  const response = await axios.get(`${API_BASE}/${id}`, getAuthHeaders());
  return response.data;
};

export const createClient = async (clientData) => {
  const response = await axios.post(API_BASE, clientData, getAuthHeaders());
  return response.data;
};

export const updateClient = async (id, clientData) => {
  const response = await axios.put(`${API_BASE}/${id}`, clientData, getAuthHeaders());
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await axios.delete(`${API_BASE}/${id}`, getAuthHeaders());
  return response.data;
};

export const exportClients = async () => {
  const response = await axios.get(`${API_BASE}/export`, getAuthHeaders());
  return response.data;
};
