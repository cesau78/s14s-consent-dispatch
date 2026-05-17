const request = require('supertest');

describe('ketchWebhookGuard', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('skips auth when no shared secret is configured', async () => {
    delete process.env.KETCH_WEBHOOK_AUTH_VALUE;
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/ketch/webhook')
      .send({ kind: 'ConsentRequest', request: {} });

    expect(res.status).toBe(204);
  });

  test('does not protect the health endpoint', async () => {
    delete process.env.KETCH_WEBHOOK_AUTH_VALUE;
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  test('enforces configured authorization header and value', async () => {
    process.env.KETCH_WEBHOOK_AUTH_HEADER = 'Authorization';
    process.env.KETCH_WEBHOOK_AUTH_VALUE = 'Bearer configured';
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const unauthorized = await request(app).post('/ketch/webhook').send({});
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'Bearer configured')
      .send({ kind: 'ConsentRequest', request: {} });
    expect(authorized.status).toBe(204);
  });

  test('supports custom auth header names', async () => {
    process.env.KETCH_WEBHOOK_AUTH_HEADER = 'X-Ketch-Token';
    process.env.KETCH_WEBHOOK_AUTH_VALUE = 'secret-token';
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const unauthorized = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'secret-token')
      .send({ kind: 'ConsentRequest', request: {} });
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .post('/ketch/webhook')
      .set('X-Ketch-Token', 'secret-token')
      .send({ kind: 'ConsentRequest', request: {} });
    expect(authorized.status).toBe(204);
  });

  test('rejects callers outside the configured IP allowlist', async () => {
    process.env.KETCH_WEBHOOK_AUTH_VALUE = 'Bearer configured';
    process.env.KETCH_ALLOWED_IPS = '203.0.113.0/24';
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'Bearer configured')
      .set('X-Forwarded-For', '198.51.100.10')
      .send({ kind: 'ConsentRequest', request: {} });

    expect(res.status).toBe(403);
  });

  test('allows callers inside the configured IP allowlist', async () => {
    process.env.KETCH_WEBHOOK_AUTH_VALUE = 'Bearer configured';
    process.env.KETCH_ALLOWED_IPS = '127.0.0.1';
    process.env.TRUST_PROXY = 'true';
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'Bearer configured')
      .set('X-Forwarded-For', '127.0.0.1')
      .send({ kind: 'ConsentRequest', request: {} });

    expect(res.status).toBe(204);
  });
});
