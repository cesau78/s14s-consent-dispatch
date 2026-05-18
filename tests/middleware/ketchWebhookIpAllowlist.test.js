const request = require('supertest');

describe('ketchWebhookIpAllowlist', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
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
