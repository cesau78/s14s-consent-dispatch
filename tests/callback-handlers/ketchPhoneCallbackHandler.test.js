const {
  handleKetchPhoneCallback,
  getEnvelopeSection
} = require('../../src/callback-handlers/ketchPhoneCallbackHandler');
const vibesClient = require('../../src/services/vibesClient');

jest.mock('../../src/services/vibesClient');

describe('handleKetchPhoneCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vibesClient.updatePersonPhone.mockResolvedValue({ person_key: 'person-123' });
  });

  test('ignores unrelated Ketch message kinds', async () => {
    const result = await handleKetchPhoneCallback({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'account_id', identityValue: '1' }]
      }
    });

    expect(result).toEqual({ status: 204, body: null });
    expect(vibesClient.updatePersonPhone).not.toHaveBeenCalled();
  });

  test('builds correction responses when metadata is omitted', async () => {
    const result = await handleKetchPhoneCallback({
      kind: 'CorrectionRequest',
      request: {
        identities: [
          { identitySpace: 'person_key', identityValue: 'person-123' },
          { identitySpace: 'phone', identityValue: '+12145551234' }
        ]
      }
    });

    expect(result.body.metadata).toEqual({});
    expect(result.body.response.status).toBe('completed');
  });

  test('updates Vibes for correction requests', async () => {
    const result = await handleKetchPhoneCallback({
      apiVersion: 'dsr/v1',
      kind: 'CorrectionRequest',
      metadata: { uid: 'req-1', tenant: 'brand' },
      request: {
        identities: [
          { identitySpace: 'person_key', identityValue: 'person-123' },
          { identitySpace: 'mobile', identityValue: '2145551111' }
        ]
      }
    });

    expect(vibesClient.updatePersonPhone).toHaveBeenCalledWith({
      phone: '+12145551111',
      personKey: 'person-123',
      externalPersonId: null
    });
    expect(result.status).toBe(200);
    expect(result.body.kind).toBe('CorrectionResponse');
    expect(result.body.response.status).toBe('completed');
  });

  test('returns 204 when correction payload has no phone change', async () => {
    const result = await handleKetchPhoneCallback({
      kind: 'CorrectionRequest',
      request: {
        identities: [{ identitySpace: 'person_key', identityValue: 'person-123' }]
      }
    });

    expect(result).toEqual({ status: 204, body: null });
    expect(vibesClient.updatePersonPhone).not.toHaveBeenCalled();
  });

  test('throws when kind is missing', async () => {
    await expect(handleKetchPhoneCallback({})).rejects.toMatchObject({ status: 400 });
  });

  test('reads request and event envelopes via getEnvelopeSection', () => {
    expect(getEnvelopeSection({ request: { identities: [] } })).toEqual({ identities: [] });
    expect(getEnvelopeSection({ event: { status: 'pending' } })).toEqual({ status: 'pending' });
    expect(getEnvelopeSection({})).toBeNull();
  });

  test('updates Vibes for correction status events', async () => {
    const result = await handleKetchPhoneCallback({
      kind: 'CorrectionStatusEvent',
      event: {
        identities: [
          { identitySpace: 'person_key', identityValue: 'person-123' },
          { identitySpace: 'phone', identityValue: '+12145551234' }
        ]
      }
    });

    expect(vibesClient.updatePersonPhone).toHaveBeenCalled();
    expect(result).toEqual({ status: 204, body: null });
  });

  test('returns 422 when phone is present without a Vibes identifier', async () => {
    await expect(
      handleKetchPhoneCallback({
        kind: 'CorrectionRequest',
        request: {
          identities: [{ identitySpace: 'phone', identityValue: '2145551111' }]
        }
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});
