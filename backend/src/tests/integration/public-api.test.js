const request = require('supertest');
const app = require('../../app');

describe('Public API', () => {
  it('reports service health without requiring a database', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      status: expect.any(String),
      database: expect.any(String),
    }));
  });

  it('reports the API smoke-test endpoint', async () => {
    const response = await request(app).get('/api/test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      message: 'API is working!',
    }));
  });

  it('handles CORS preflight without requiring a database', async () => {
    const response = await request(app)
      .options('/api/auth/register')
      .set('Origin', 'https://construction-material-price-comparison-portal-axsw-6l3wgywzw.vercel.app')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
  });

  it('returns a consistent 404 response for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: 'Route not found',
    }));
  });
});
