export const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
export const daysSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
