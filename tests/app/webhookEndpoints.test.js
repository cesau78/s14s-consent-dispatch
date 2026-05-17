const request = require('supertest');

describe('configured webhook endpoints', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('registers paths from KETCH_WEBHOOK_PATHS', async () => {
    process.env.KETCH_WEBHOOK_PATHS = '/hooks/ketch-phone,/ketch/legacy';
    process.env.KETCH_WEBHOOK_AUTH_VALUE = 'Bearer test-token';
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const missing = await request(app).post('/ketch/webhook').send({ kind: 'ConsentRequest' });
    expect(missing.status).toBe(404);

    const configured = await request(app)
      .post('/hooks/ketch-phone')
      .set('Authorization', 'Bearer test-token')
      .send({ kind: 'ConsentRequest', request: {} });
    expect(configured.status).toBe(204);
  });
});
