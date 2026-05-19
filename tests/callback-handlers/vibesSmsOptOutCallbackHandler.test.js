const { processVibesSmsOptOut } = require('../../src/callback-handlers/vibesSmsOptOutCallbackHandler');
const ketchConsentClient = require('../../src/services/ketchConsentClient');

jest.mock('../../src/services/ketchConsentClient');

describe('processVibesSmsOptOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ketchConsentClient.recordSmsMarketingOptOut.mockResolvedValue({ status: 204, body: null });
  });

  test('returns empty downstream when payload is not an opt-out', async () => {
    const result = await processVibesSmsOptOut({
      person_key: 'person-123',
      message: 'thanks',
      message_type: 'MO'
    });

    expect(result.body.downstream).toEqual([]);
    expect(ketchConsentClient.recordSmsMarketingOptOut).not.toHaveBeenCalled();
  });

  test('records opt-out in Ketch for MO no reply', async () => {
    const result = await processVibesSmsOptOut({
      person_key: 'person-123',
      phone_number_e164_format: '+12145551234',
      message: 'no',
      message_type: 'MO'
    });

    expect(ketchConsentClient.recordSmsMarketingOptOut).toHaveBeenCalledWith({
      personKey: 'person-123',
      phone: '+12145551234'
    });
    expect(result.body.downstream[0].system).toBe('Ketch');
  });
});
