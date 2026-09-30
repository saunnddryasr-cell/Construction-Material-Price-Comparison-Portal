const API_URL =
  process.env.API_URL ||
  (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5000/api');

if (!API_URL) {
  throw new Error('API_URL must be configured in production');
}

module.exports = API_URL;