import api from './index';

export const createInquiry = (payload) => api.post('/inquiries', payload);
