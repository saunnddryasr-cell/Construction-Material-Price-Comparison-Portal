import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const defaultApiUrl = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : undefined;
const apiUrl = configuredApiUrl || defaultApiUrl;

if (!apiUrl) {
  throw new Error('VITE_API_URL must be set to the deployed backend URL ending in /api');
}

const normalizedApiUrl = apiUrl.replace(/\/+$/, '');
const baseURL = normalizedApiUrl.endsWith('/api')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

export const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('buildwise_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
