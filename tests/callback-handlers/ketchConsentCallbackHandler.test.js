const { processConsentRequest } = require('../../src/callback-handlers/ketchConsentCallbackHandler');
const vibesClient = require('../../src/services/vibesClient');
const messageGearsClient = require('../../src/services/messageGearsClient');

jest.mock('../../src/services/vibesClient');
jest.mock('../../src/services/messageGearsClient');

describe('processConsentRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VIBES_SMS_SUBSCRIPTION_LIST_ID = 'sms-list-1';
    vibesClient.unsubscribePersonFromList.mockResolvedValue({ status: 204, body: null });
    messageGearsClient.optOutRecipient.mockResolvedValue({ status: 200, body: { recipientId: 'mg-1' } });
  });

  test('unsubscribes Vibes when sms marketing is denied', async () => {
    const result = await processConsentRequest({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'person_key', identityValue: 'person-123' }],
        purposes: { sms_mktg: 'denied' }
      }
    });

    expect(vibesClient.unsubscribePersonFromList).toHaveBeenCalledWith('person-123');
    expect(messageGearsClient.optOutRecipient).not.toHaveBeenCalled();
    expect(result.body.downstream).toEqual([
      expect.objectContaining({ system: 'Vibes', update: 204 })
    ]);
  });

  test('opts out MessageGears when email marketing is denied', async () => {
    const result = await processConsentRequest({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' }],
        purposes: { email_mktg: 'denied' }
      }
    });

    expect(messageGearsClient.optOutRecipient).toHaveBeenCalledWith({
      recipientId: 'mg-recipient-abc123',
      externalRecipientId: null
    });
    expect(vibesClient.unsubscribePersonFromList).not.toHaveBeenCalled();
    expect(result.body.downstream[0].system).toBe('MessageGears');
  });

  test('propagates both channels when sms and email are denied', async () => {
    const result = await processConsentRequest({
      kind: 'ConsentRequest',
      request: {
        identities: [
          { identitySpace: 'person_key', identityValue: 'person-123' },
          { identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' }
        ],
        purposes: {
          sms_mktg: 'denied',
          email_mktg: 'denied'
        }
      }
    });

    expect(vibesClient.unsubscribePersonFromList).toHaveBeenCalled();
    expect(messageGearsClient.optOutRecipient).toHaveBeenCalled();
    expect(result.body.downstream.map((entry) => entry.system).sort()).toEqual([
      'MessageGears',
      'Vibes'
    ]);
  });

  test('skips Vibes when consent originated from Vibes SMS opt-out', async () => {
    const result = await processConsentRequest({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'person_key', identityValue: 'person-123' }],
        purposes: { sms_mktg: 'denied' },
        context: { consent_dispatch_origin: 'vibes_sms_optout' }
      }
    });

    expect(vibesClient.unsubscribePersonFromList).not.toHaveBeenCalled();
    expect(result.body.downstream).toEqual([]);
  });

  test('skips MessageGears when consent originated from MessageGears email opt-out', async () => {
    const result = await processConsentRequest({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' }],
        purposes: { email_mktg: 'denied' },
        context: { consent_dispatch_origin: 'messagegears_email_optout' }
      }
    });

    expect(messageGearsClient.optOutRecipient).not.toHaveBeenCalled();
    expect(result.body.downstream).toEqual([]);
  });
});
