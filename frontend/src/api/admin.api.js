import api from './index';

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const setSupplierVerified = (id, verified) => api.put(`/admin/suppliers/${id}/verification`, { verified });
export const deactivateAdminUser = (id) => api.delete(`/admin/users/${id}`);
export const getPriceUpdates = () => api.get('/admin/prices/updates');
export const getAdminReport = (params) => api.get('/admin/reports', { params });