const request = require('supertest');
const { LOCAL_DEV_CALLBACK_AUTH_VALUE } = require('../../src/config');

describe('vibesCallbackAuth', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('rejects callbacks when no shared secret is configured', async () => {
    delete process.env.VIBES_CALLBACK_AUTH_VALUE;
    process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer ketch';
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/vibes/webhook')
      .send({ message: 'no', message_type: 'MO' });

    expect(res.status).toBe(401);
  });

  test('rejects missing or invalid authorization', async () => {
    process.env.VIBES_CALLBACK_AUTH_VALUE = 'Bearer vibes-secret';
    process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer ketch';
    jest.resetModules();
    const app = require('../../src/app');

    const missing = await request(app)
      .post('/vibes/webhook')
      .send({ message: 'no', message_type: 'MO', person_key: 'p1' });
    expect(missing.status).toBe(401);

    const invalid = await request(app)
      .post('/vibes/webhook')
      .set('Authorization', 'Bearer wrong')
      .send({ message: 'no', message_type: 'MO', person_key: 'p1' });
    expect(invalid.status).toBe(401);
  });

  test('accepts matching authorization header', async () => {
    process.env.VIBES_CALLBACK_AUTH_VALUE = 'Bearer vibes-secret';
    process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer ketch';
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/vibes/webhook')
      .set('Authorization', 'Bearer vibes-secret')
      .send({ message: 'hello', message_type: 'MO', person_key: 'p1' });

    expect(res.status).toBe(200);
  });
});
