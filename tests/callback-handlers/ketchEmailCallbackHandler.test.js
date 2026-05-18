const { processEmailCorrection } = require('../../src/callback-handlers/ketchEmailCallbackHandler');
const messageGearsClient = require('../../src/services/messageGearsClient');

jest.mock('../../src/services/messageGearsClient');

describe('processEmailCorrection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    messageGearsClient.updateRecipientEmail.mockResolvedValue({
      status: 200,
      body: { recipientId: 'mg-recipient-abc123' }
    });
  });

  test('returns null when no email is present', async () => {
    const result = await processEmailCorrection({
      kind: 'CorrectionRequest',
      request: {
        identities: [{ identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' }]
      }
    });

    expect(result).toBeNull();
    expect(messageGearsClient.updateRecipientEmail).not.toHaveBeenCalled();
  });

  test('returns downstream details when MessageGears is updated', async () => {
    const result = await processEmailCorrection({
      kind: 'CorrectionRequest',
      request: {
        identities: [
          { identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' },
          { identitySpace: 'email', identityValue: 'subscriber@example.com' }
        ]
      }
    });

    expect(messageGearsClient.updateRecipientEmail).toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(result.body.downstream[0]).toMatchObject({
      system: 'MessageGears',
      update: 200
    });
    expect(result.body.downstream[0].updated).toMatch(/^\d{8}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  test('returns 422 when email is present without a MessageGears identifier', async () => {
    await expect(
      processEmailCorrection({
        kind: 'CorrectionRequest',
        request: {
          identities: [{ identitySpace: 'email', identityValue: 'only@example.com' }]
        }
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});
