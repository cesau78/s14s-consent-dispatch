const request = require('supertest');

describe('app error handler', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
    jest.dontMock('../../src/services/vibesClient');
  });

  function loadAppWithVibesMock(mockImpl) {
    jest.resetModules();
    jest.doMock('../../src/services/vibesClient', () => ({
      updatePersonPhone: jest.fn(mockImpl)
    }));
    process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer test-token';
    process.env.VIBES_COMPANY_KEY = 'company-1';
    process.env.VIBES_API_USERNAME = 'user';
    process.env.VIBES_API_PASSWORD = 'pass';
    return require('../../src/app');
  }

  test('returns validation errors with status codes from handlers', async () => {
    const app = loadAppWithVibesMock();

    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'Bearer test-token')
      .send({
        kind: 'CorrectionRequest',
        request: {
          identities: [{ identitySpace: 'phone', identityValue: '+12145551234' }]
        }
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/person_key or external_person_id/);
  });

  test('returns Vibes error details', async () => {
    const app = loadAppWithVibesMock(() =>
      Promise.reject(
        Object.assign(new Error('Vibes API 409'), {
          status: 409,
          body: { message: 'MDN conflict' }
        })
      )
    );

    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'Bearer test-token')
      .send({
        kind: 'CorrectionRequest',
        request: {
          identities: [
            { identitySpace: 'person_key', identityValue: 'person-123' },
            { identitySpace: 'phone', identityValue: '+12145551234' }
          ]
        }
      });

    expect(res.status).toBe(409);
    expect(res.body.details).toEqual({ message: 'MDN conflict' });
  });

  test('returns handler errors without details when no body is present', async () => {
    const app = loadAppWithVibesMock(() =>
      Promise.reject(
        Object.assign(new Error('Vibes API 502'), {
          status: 502
        })
      )
    );

    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'Bearer test-token')
      .send({
        kind: 'CorrectionRequest',
        request: {
          identities: [
            { identitySpace: 'person_key', identityValue: 'person-123' },
            { identitySpace: 'phone', identityValue: '+12145551234' }
          ]
        }
      });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Vibes API 502');
    expect(res.body.details).toBeUndefined();
  });

  test('returns a generic 500 when an error has no status or message', async () => {
    const app = loadAppWithVibesMock(() => Promise.reject({}));

    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'Bearer test-token')
      .send({
        kind: 'CorrectionRequest',
        request: {
          identities: [
            { identitySpace: 'person_key', identityValue: 'person-123' },
            { identitySpace: 'phone', identityValue: '+12145551234' }
          ]
        }
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
