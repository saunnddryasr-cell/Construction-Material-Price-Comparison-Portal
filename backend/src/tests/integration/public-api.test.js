const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User.model');
const Material = require('../../models/Material.model');
const Inquiry = require('../../models/Inquiry.model');
const { generateToken } = require('../../middleware/auth.middleware');
const emailService = require('../../services/email.service');

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
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5174');
  });

  it('serves the dashboard at the documented API path', async () => {
    const response = await request(app).get('/api/dashboard');

    expect(response.status).toBe(200);
    expect(response.body.data.stats).toEqual({
      materials: 0,
      suppliers: 0,
      prices: 0,
    });
  });

  it('serves the material and supplier directory APIs', async () => {
    const [materialsResponse, suppliersResponse] = await Promise.all([
      request(app).get('/api/materials'),
      request(app).get('/api/suppliers'),
    ]);

    expect(materialsResponse.status).toBe(200);
    expect(Array.isArray(materialsResponse.body.data.materials)).toBe(true);
    expect(suppliersResponse.status).toBe(200);
    expect(Array.isArray(suppliersResponse.body.data.suppliers)).toBe(true);
  });

  it('serves price comparison data for a material category', async () => {
    await Material.create({
      name: 'Portland Cement',
      category: 'cement',
      unit: 'bag',
    });

    const response = await request(app)
      .get('/api/prices/compare')
      .query({ materialId: 'cement' });

    expect(response.status).toBe(200);
    expect(response.body.data.material.name).toBe('Portland Cement');
    expect(response.body.data.quotes).toEqual([]);
  });

  it('requires authentication before accepting an inquiry', async () => {
    const response = await request(app)
      .post('/api/inquiries')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('persists a valid inquiry for an authenticated contractor', async () => {
    const suffix = Date.now().toString();
    const contractor = await User.create({
      username: `contractor${suffix}`,
      email: `contractor${suffix}@example.com`,
      password: 'StrongPassword123!',
      role: 'contractor',
      profile: { phone: '9876543210' },
    });
    const supplier = await User.create({
      username: `supplier${suffix}`,
      email: `supplier${suffix}@example.com`,
      password: 'StrongPassword123!',
      role: 'supplier',
      profile: { phone: '9876543211', companyName: 'Test Supplier' },
    });
    const material = await Material.create({
      name: 'Portland Cement',
      category: 'cement',
      unit: 'bag',
    });
    const emailSpy = jest
      .spyOn(emailService, 'sendInquiryNotification')
      .mockResolvedValue(undefined);

    try {
      const response = await request(app)
        .post('/api/inquiries')
        .set('Authorization', `Bearer ${generateToken(contractor)}`)
        .send({
          materialId: material.id,
          supplierId: supplier.id,
          quantity: 25,
          message: 'Please share current pricing and delivery availability.',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.inquiry.status).toBe('pending');
      await expect(Inquiry.countDocuments()).resolves.toBe(1);
    } finally {
      emailSpy.mockRestore();
    }
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
