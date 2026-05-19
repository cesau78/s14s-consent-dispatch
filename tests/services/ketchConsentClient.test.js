const ketchConsentClient = require('../../src/services/ketchConsentClient');

describe('ketchConsentClient', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KETCH_ORGANIZATION_CODE = 'org-dev';
    process.env.KETCH_PROPERTY_CODE = 'property-dev';
    process.env.KETCH_ENVIRONMENT_CODE = 'production';
    process.env.KETCH_JURISDICTION_CODE = 'usca';
    process.env.KETCH_API_BASE_URL = 'https://ketch.example/web/v2';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  test('buildSetConsentBody supports phone-only identities', () => {
    const body = ketchConsentClient.buildSetConsentBody({
      phone: '+12145551234',
      collectedAt: 1715900000
    });

    expect(body.identities.phone).toBe('+12145551234');
    expect(body.identities.vibes_person_key).toBeUndefined();
  });

  test('buildSetConsentBody includes origin context and denied sms purpose', () => {
    const body = ketchConsentClient.buildSetConsentBody({
      personKey: 'person-123',
      phone: '+12145551234',
      collectedAt: 1715900000
    });

    expect(body.organizationCode).toBe('org-dev');
    expect(body.purposes.sms_mktg).toEqual({
      allowed: 'false',
      legalBasisCode: 'consent_optout'
    });
    expect(body.context).toEqual({ consent_dispatch_origin: 'vibes_sms_optout' });
    expect(body.identities.vibes_person_key).toBe('person-123');
    expect(body.identities.phone).toBe('+12145551234');
  });

  test('throws when required Ketch settings are missing', async () => {
    const cases = [
      ['KETCH_ORGANIZATION_CODE', 'KETCH_ORGANIZATION_CODE is required'],
      ['KETCH_PROPERTY_CODE', 'KETCH_PROPERTY_CODE is required'],
      ['KETCH_JURISDICTION_CODE', 'KETCH_JURISDICTION_CODE is required']
    ];

    for (const [envKey, message] of cases) {
      process.env = { ...originalEnv };
      process.env.KETCH_ORGANIZATION_CODE = 'org-dev';
      process.env.KETCH_PROPERTY_CODE = 'property-dev';
      process.env.KETCH_ENVIRONMENT_CODE = 'production';
      process.env.KETCH_JURISDICTION_CODE = 'usca';
      process.env.KETCH_API_BASE_URL = 'https://ketch.example/web/v2';
      delete process.env[envKey];
      jest.resetModules();
      const client = require('../../src/services/ketchConsentClient');

      await expect(
        client.recordSmsMarketingOptOut({ personKey: 'p1', phone: '+12145551234' })
      ).rejects.toThrow(message);
    }

  });

  test('throws when neither personKey nor phone is provided', async () => {
    await expect(ketchConsentClient.recordSmsMarketingOptOut({})).rejects.toThrow(
      'personKey or phone is required'
    );
  });

  test('sends Authorization header when KETCH_API_KEY is set', async () => {
    process.env.KETCH_API_KEY = 'secret-key';
    jest.resetModules();
    const client = require('../../src/services/ketchConsentClient');

    global.fetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => ''
    });

    await client.recordSmsMarketingOptOut({ personKey: 'person-123' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-key'
        })
      })
    );
  });

  test('surfaces Ketch API errors', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":"bad request"}'
    });

    await expect(
      ketchConsentClient.recordSmsMarketingOptOut({ personKey: 'person-123' })
    ).rejects.toMatchObject({ status: 400, body: { error: 'bad request' } });
  });

  test('returns non-JSON Ketch error bodies as plain text', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'upstream error'
    });

    await expect(
      ketchConsentClient.recordSmsMarketingOptOut({ personKey: 'person-123' })
    ).rejects.toMatchObject({ status: 502, body: 'upstream error' });
  });

  test('recordSmsMarketingOptOut posts to Ketch consent update endpoint', async () => {
    delete process.env.KETCH_API_KEY;
    global.fetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => ''
    });

    const result = await ketchConsentClient.recordSmsMarketingOptOut({
      personKey: 'person-123',
      phone: '+12145551234'
    });

    expect(result.status).toBe(204);
    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://ketch.example/web/v2/consent/org-dev/update',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
