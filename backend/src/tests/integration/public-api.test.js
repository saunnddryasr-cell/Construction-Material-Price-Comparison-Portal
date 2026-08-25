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

  it('returns a consistent 404 response for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: 'Route not found',
    }));
  });
});
