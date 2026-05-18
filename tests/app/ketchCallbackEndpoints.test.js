const request = require('supertest');

describe('configured Ketch callback endpoints', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('registers paths from KETCH_CALLBACK_PATHS', async () => {
    process.env.KETCH_CALLBACK_PATHS = '/hooks/ketch-phone,/ketch/legacy';
    process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer test-token';
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

  test('accepts legacy KETCH_WEBHOOK_PATHS env var', async () => {
    process.env.KETCH_WEBHOOK_PATHS = '/hooks/legacy-webhook';
    process.env.KETCH_WEBHOOK_AUTH_VALUE = 'Bearer test-token';
    delete process.env.KETCH_CALLBACK_PATHS;
    delete process.env.KETCH_CALLBACK_AUTH_VALUE;
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/hooks/legacy-webhook')
      .set('Authorization', 'Bearer test-token')
      .send({ kind: 'ConsentRequest', request: {} });
    expect(res.status).toBe(204);
  });
});
