const vibesClient = require('../../src/services/vibesClient');

describe('vibesClient.updatePersonPhone', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.VIBES_COMPANY_KEY = 'company-1';
    process.env.VIBES_API_USERNAME = 'vibes-user';
    process.env.VIBES_API_PASSWORD = 'vibes-pass';
    process.env.VIBES_API_VERSION = '2';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('PUTs phone updates when person key is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ person_key: 'person-123' })
    });

    const result = await vibesClient.updatePersonPhone({
      personKey: 'person-123',
      phone: '+12145551234'
    });

    expect(result.status).toBe(200);
    expect(result.body.person_key).toBe('person-123');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://public-api.vibescm.com/companies/company-1/mobiledb/persons/person-123',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          mobile_phone: { mdn: '+12145551234' }
        })
      })
    );
  });

  test('POSTs when only external person id is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ person_key: 'new-person' })
    });

    await vibesClient.updatePersonPhone({
      externalPersonId: 'crm-9',
      phone: '+12145559876'
    });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      external_person_id: 'crm-9',
      mobile_phone: { mdn: '+12145559876' }
    });
  });

  test('throws when Vibes credentials are missing', async () => {
    process.env.VIBES_API_PASSWORD = '';

    await expect(
      vibesClient.updatePersonPhone({
        personKey: 'person-123',
        phone: '+12145551234'
      })
    ).rejects.toThrow('VIBES_API_USERNAME and VIBES_API_PASSWORD are required');
  });

  test('throws when Vibes returns an error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({ message: 'MDN conflict' })
    });

    await expect(
      vibesClient.updatePersonPhone({
        personKey: 'person-123',
        phone: '+12145551234'
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  test('throws when neither person key nor external person id is provided', async () => {
    await expect(
      vibesClient.updatePersonPhone({
        phone: '+12145551234'
      })
    ).rejects.toThrow('personKey or externalPersonId is required to update Vibes');
  });

  test('returns an empty body when Vibes responds with no content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => ''
    });

    const result = await vibesClient.updatePersonPhone({
      personKey: 'person-123',
      phone: '+12145551234'
    });

    expect(result.status).toBe(200);
    expect(result.body).toBeNull();
  });

  test('returns plain-text Vibes error bodies when JSON parsing fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'upstream error'
    });

    await expect(
      vibesClient.updatePersonPhone({
        personKey: 'person-123',
        phone: '+12145551234'
      })
    ).rejects.toMatchObject({ status: 500, body: 'upstream error' });
  });

  test('throws when company key is missing', async () => {
    process.env.VIBES_COMPANY_KEY = '';

    await expect(
      vibesClient.updatePersonPhone({
        personKey: 'person-123',
        phone: '+12145551234'
      })
    ).rejects.toThrow('VIBES_COMPANY_KEY is required');
  });

  test('unsubscribePersonFromList deletes subscription', async () => {
    process.env.VIBES_SMS_SUBSCRIPTION_LIST_ID = 'sms-list-1';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => ''
    });

    const result = await vibesClient.unsubscribePersonFromList('person-123');

    expect(result.status).toBe(204);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions/sms-list-1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('unsubscribePersonFromList validates required settings', async () => {
    process.env.VIBES_COMPANY_KEY = '';
    await expect(vibesClient.unsubscribePersonFromList('person-123')).rejects.toThrow(
      'VIBES_COMPANY_KEY is required'
    );

    process.env.VIBES_COMPANY_KEY = 'company-1';
    process.env.VIBES_API_USERNAME = '';
    await expect(vibesClient.unsubscribePersonFromList('person-123')).rejects.toThrow(
      'VIBES_API_USERNAME and VIBES_API_PASSWORD are required'
    );

    process.env.VIBES_API_USERNAME = 'user';
    await expect(vibesClient.unsubscribePersonFromList('')).rejects.toThrow(
      'personKey is required'
    );

    process.env.VIBES_SMS_SUBSCRIPTION_LIST_ID = '';
    await expect(vibesClient.unsubscribePersonFromList('person-123')).rejects.toThrow(
      'VIBES_SMS_SUBSCRIPTION_LIST_ID is required'
    );
  });

  test('unsubscribePersonFromList propagates non-404 errors', async () => {
    process.env.VIBES_SMS_SUBSCRIPTION_LIST_ID = 'sms-list-1';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '{"error":"fail"}'
    });

    await expect(vibesClient.unsubscribePersonFromList('person-123')).rejects.toMatchObject({
      status: 500
    });
  });

  test('unsubscribePersonFromList treats 404 as success', async () => {
    process.env.VIBES_SMS_SUBSCRIPTION_LIST_ID = 'sms-list-1';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '{"error":"not subscribed"}'
    });

    const result = await vibesClient.unsubscribePersonFromList('person-123');

    expect(result.status).toBe(204);
  });
});
