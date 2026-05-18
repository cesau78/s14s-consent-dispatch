const { processPhoneCorrection } = require('../../src/callback-handlers/ketchPhoneCallbackHandler');
const vibesClient = require('../../src/services/vibesClient');

jest.mock('../../src/services/vibesClient');

describe('processPhoneCorrection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vibesClient.updatePersonPhone.mockResolvedValue({ status: 200, body: { person_key: 'person-123' } });
  });

  test('returns null when no phone is present', async () => {
    const result = await processPhoneCorrection({
      kind: 'CorrectionRequest',
      request: {
        identities: [{ identitySpace: 'person_key', identityValue: 'person-123' }]
      }
    });

    expect(result).toBeNull();
    expect(vibesClient.updatePersonPhone).not.toHaveBeenCalled();
  });

  test('returns downstream details when Vibes is updated', async () => {
    const fixedDate = new Date('2026-05-01T12:12:12.123Z');
    jest.useFakeTimers().setSystemTime(fixedDate);

    const result = await processPhoneCorrection({
      kind: 'CorrectionRequest',
      request: {
        identities: [
          { identitySpace: 'person_key', identityValue: 'person-123' },
          { identitySpace: 'phone', identityValue: '+12145551234' }
        ]
      }
    });

    expect(vibesClient.updatePersonPhone).toHaveBeenCalled();
    expect(result).toEqual({
      status: 200,
      body: {
        downstream: [
          {
            system: 'Vibes',
            update: 200,
            updated: '20260501T12:12:12.123'
          }
        ]
      }
    });

    jest.useRealTimers();
  });

  test('returns 422 when phone is present without a Vibes identifier', async () => {
    await expect(
      processPhoneCorrection({
        kind: 'CorrectionRequest',
        request: {
          identities: [{ identitySpace: 'phone', identityValue: '2145551111' }]
        }
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});
