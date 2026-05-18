const { dispatchKetchCallback } = require('../../src/services/ketchCallbackDispatcher');
const vibesClient = require('../../src/services/vibesClient');
const messageGearsClient = require('../../src/services/messageGearsClient');

jest.mock('../../src/services/vibesClient');
jest.mock('../../src/services/messageGearsClient');

describe('dispatchKetchCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vibesClient.updatePersonPhone.mockResolvedValue({ status: 200, body: { person_key: 'person-123' } });
    messageGearsClient.updateRecipientEmail.mockResolvedValue({
      status: 200,
      body: { recipientId: 'mg-recipient-abc123' }
    });
  });

  test('returns empty downstream for unrelated Ketch message kinds', async () => {
    const result = await dispatchKetchCallback({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'account_id', identityValue: '1' }]
      }
    });

    expect(result).toEqual({ status: 200, body: { downstream: [] } });
    expect(vibesClient.updatePersonPhone).not.toHaveBeenCalled();
    expect(messageGearsClient.updateRecipientEmail).not.toHaveBeenCalled();
  });

  test('throws when kind is missing', async () => {
    await expect(dispatchKetchCallback({})).rejects.toMatchObject({ status: 400 });
  });

  test('prefers phone updates when both phone and email are present', async () => {
    const result = await dispatchKetchCallback({
      kind: 'CorrectionRequest',
      request: {
        identities: [
          { identitySpace: 'person_key', identityValue: 'person-123' },
          { identitySpace: 'phone', identityValue: '+12145551234' },
          { identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' },
          { identitySpace: 'email', identityValue: 'both@example.com' }
        ]
      }
    });

    expect(vibesClient.updatePersonPhone).toHaveBeenCalled();
    expect(messageGearsClient.updateRecipientEmail).not.toHaveBeenCalled();
    expect(result.body.downstream[0].system).toBe('Vibes');
  });

  test('routes email-only corrections to MessageGears', async () => {
    const result = await dispatchKetchCallback({
      kind: 'CorrectionRequest',
      request: {
        identities: [
          { identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' },
          { identitySpace: 'email', identityValue: 'email.only@example.com' }
        ]
      }
    });

    expect(messageGearsClient.updateRecipientEmail).toHaveBeenCalled();
    expect(vibesClient.updatePersonPhone).not.toHaveBeenCalled();
    expect(result.body.downstream[0].system).toBe('MessageGears');
  });

  test('returns empty downstream when correction payload has neither phone nor email', async () => {
    const result = await dispatchKetchCallback({
      kind: 'CorrectionRequest',
      request: {
        identities: [{ identitySpace: 'person_key', identityValue: 'person-123' }]
      }
    });

    expect(result).toEqual({ status: 200, body: { downstream: [] } });
  });
});
