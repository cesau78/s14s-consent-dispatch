const request = require('supertest');
const { LOCAL_DEV_WEBHOOK_AUTH_VALUE } = require('../../src/config');

describe('ketchWebhookAuth', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('rejects webhooks when no shared secret is configured', async () => {
    delete process.env.KETCH_WEBHOOK_AUTH_VALUE;
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/ketch/webhook')
      .send({ kind: 'ConsentRequest', request: {} });

    expect(res.status).toBe(401);
  });

  test('rejects an empty shared secret', async () => {
    process.env.KETCH_WEBHOOK_AUTH_VALUE = '   ';
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', LOCAL_DEV_WEBHOOK_AUTH_VALUE)
      .send({ kind: 'ConsentRequest', request: {} });

    expect(res.status).toBe(401);
  });

  test('requires Bearer local-dev and a local TCP peer for local dev auth', async () => {
    process.env.KETCH_WEBHOOK_AUTH_VALUE = LOCAL_DEV_WEBHOOK_AUTH_VALUE;
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    const app = require('../../src/app');

    const unauthorized = await request(app)
      .post('/ketch/webhook')
      .send({ kind: 'ConsentRequest', request: {} });
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', LOCAL_DEV_WEBHOOK_AUTH_VALUE)
      .send({ kind: 'ConsentRequest', request: {} });
    expect(authorized.status).toBe(204);
  });

  test('rejects local-dev auth from a non-local TCP peer', async () => {
    process.env.KETCH_WEBHOOK_AUTH_VALUE = LOCAL_DEV_WEBHOOK_AUTH_VALUE;
    jest.resetModules();
    jest
      .spyOn(require('../../src/services/clientIp'), 'isLocalDevCaller')
      .mockReturnValue(false);
    const app = require('../../src/app');

    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', LOCAL_DEV_WEBHOOK_AUTH_VALUE)
      .send({ kind: 'ConsentRequest', request: {} });

    expect(res.status).toBe(403);
    jest.restoreAllMocks();
  });

  test('rejects local-dev auth when X-Forwarded-For spoofs loopback but peer is remote', async () => {
    process.env.KETCH_WEBHOOK_AUTH_VALUE = LOCAL_DEV_WEBHOOK_AUTH_VALUE;
    jest.resetModules();
    const { isLocalDevCaller } = require('../../src/services/clientIp');

    const req = {
      get: (name) =>
        name.toLowerCase() === 'x-forwarded-for' ? '127.0.0.1' : undefined,
      ip: '203.0.113.10',
      socket: { remoteAddress: '::ffff:203.0.113.10' }
    };

    expect(isLocalDevCaller(req)).toBe(false);
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
});
