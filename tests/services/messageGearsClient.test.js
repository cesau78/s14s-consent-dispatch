const messageGearsClient = require('../../src/services/messageGearsClient');

describe('messageGearsClient.updateRecipientEmail', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.MESSAGEGEARS_ACCOUNT_ID = 'account-1';
    process.env.MESSAGEGEARS_API_KEY = 'mg-api-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('PUTs email updates when recipient id is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ recipientId: 'mg-recipient-abc123' })
    });

    const result = await messageGearsClient.updateRecipientEmail({
      recipientId: 'mg-recipient-abc123',
      email: 'subscriber@example.com'
    });

    expect(result.status).toBe(200);
    expect(result.body.recipientId).toBe('mg-recipient-abc123');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.messagegears.com/api/v1/accounts/account-1/recipients/mg-recipient-abc123',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          emailAddress: 'subscriber@example.com'
        })
      })
    );
  });

  test('POSTs when only external recipient id is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ recipientId: 'new-recipient' })
    });

    await messageGearsClient.updateRecipientEmail({
      externalRecipientId: 'crm-9',
      email: 'subscriber@example.com'
    });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      emailAddress: 'subscriber@example.com',
      externalRecipientId: 'crm-9'
    });
  });

  test('throws when MessageGears credentials are missing', async () => {
    process.env.MESSAGEGEARS_API_KEY = '';

    await expect(
      messageGearsClient.updateRecipientEmail({
        recipientId: 'mg-recipient-abc123',
        email: 'subscriber@example.com'
      })
    ).rejects.toThrow('MESSAGEGEARS_API_KEY is required');
  });

  test('throws when MessageGears returns an error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({ message: 'Email conflict' })
    });

    await expect(
      messageGearsClient.updateRecipientEmail({
        recipientId: 'mg-recipient-abc123',
        email: 'subscriber@example.com'
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  test('throws when neither recipient id nor external recipient id is provided', async () => {
    await expect(
      messageGearsClient.updateRecipientEmail({
        email: 'subscriber@example.com'
      })
    ).rejects.toThrow('recipientId or externalRecipientId is required to update MessageGears');
  });

  test('returns an empty body when MessageGears responds with no content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => ''
    });

    const result = await messageGearsClient.updateRecipientEmail({
      recipientId: 'mg-recipient-abc123',
      email: 'subscriber@example.com'
    });

    expect(result.status).toBe(200);
    expect(result.body).toBeNull();
  });

  test('returns plain-text error bodies when JSON parsing fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'upstream error'
    });

    await expect(
      messageGearsClient.updateRecipientEmail({
        recipientId: 'mg-recipient-abc123',
        email: 'subscriber@example.com'
      })
    ).rejects.toMatchObject({ status: 500, body: 'upstream error' });
  });

  test('throws when account id is missing', async () => {
    process.env.MESSAGEGEARS_ACCOUNT_ID = '';

    await expect(
      messageGearsClient.updateRecipientEmail({
        recipientId: 'mg-recipient-abc123',
        email: 'subscriber@example.com'
      })
    ).rejects.toThrow('MESSAGEGEARS_ACCOUNT_ID is required');
  });
});
