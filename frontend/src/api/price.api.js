import api from './index';
export const getPrices = (params) => api.get('/prices', { params });
export const comparePrices = (materialIds) => api.post('/comparison', { materialIds });
export const getPriceComparison = (materialId = 'cement') => api.get('/prices/compare', { params: { materialId } });
