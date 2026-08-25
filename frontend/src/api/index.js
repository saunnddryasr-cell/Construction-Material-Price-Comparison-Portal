import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'https://construction-material-price-comparison-portal-3tlc-orl8qkek4.vercel.app/api', timeout: 5000 });
api.interceptors.request.use((config) => { const token = localStorage.getItem('buildwise_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
export default api;
