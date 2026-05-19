const request = require('supertest');

describe('vibesCallbackIpAllowlist', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('rejects all callers when VIBES_ALLOWED_IPS is unset', async () => {
    process.env.VIBES_CALLBACK_AUTH_VALUE = 'Bearer configured';
    process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer ketch';
    delete process.env.VIBES_ALLOWED_IPS;
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/vibes/webhook')
      .set('Authorization', 'Bearer configured')
      .set('X-Forwarded-For', '127.0.0.1')
      .send({ message: 'no', message_type: 'MO', person_key: 'p1' });

    expect(res.status).toBe(403);
  });

  test('rejects callers outside the configured IP allowlist', async () => {
    process.env.VIBES_CALLBACK_AUTH_VALUE = 'Bearer configured';
    process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer ketch';
    process.env.VIBES_ALLOWED_IPS = '203.0.113.0/24';
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/vibes/webhook')
      .set('Authorization', 'Bearer configured')
      .set('X-Forwarded-For', '198.51.100.10')
      .send({ message: 'no', message_type: 'MO', person_key: 'p1' });

    expect(res.status).toBe(403);
  });

  test('allows callers inside the configured IP allowlist', async () => {
    process.env.VIBES_CALLBACK_AUTH_VALUE = 'Bearer configured';
    process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer ketch';
    process.env.VIBES_ALLOWED_IPS = '127.0.0.1';
    process.env.TRUST_PROXY = 'true';
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/vibes/webhook')
      .set('Authorization', 'Bearer configured')
      .set('X-Forwarded-For', '127.0.0.1')
      .send({ message: 'hello', message_type: 'MO', person_key: 'p1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ downstream: [] });
  });
});
