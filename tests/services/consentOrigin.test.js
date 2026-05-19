const {
  isVibesSmsOptOutOrigin,
  isMessageGearsEmailOptOutOrigin,
  buildVibesSmsOptOutContext
} = require('../../src/services/consentOrigin');

describe('consentOrigin', () => {
  test('detects Vibes SMS opt-out origin in context', () => {
    expect(
      isVibesSmsOptOutOrigin({
        consent_dispatch_origin: 'vibes_sms_optout'
      })
    ).toBe(true);
    expect(
      isVibesSmsOptOutOrigin({
        Consent_Dispatch_Origin: 'vibes_sms_optout'
      })
    ).toBe(true);
    expect(isVibesSmsOptOutOrigin({ consent_dispatch_origin: 'ketch_ui' })).toBe(false);
    expect(isVibesSmsOptOutOrigin({ other_key: 'vibes_sms_optout' })).toBe(false);
    expect(isVibesSmsOptOutOrigin(null)).toBe(false);
  });

  test('isConsentOrigin returns false for unrelated context keys', () => {
    const { isConsentOrigin } = require('../../src/services/consentOrigin');
    expect(isConsentOrigin({ other_key: 'vibes_sms_optout' }, 'vibes_sms_optout')).toBe(false);
    expect(isConsentOrigin({ consent_dispatch_origin: 'vibes_sms_optout' }, undefined)).toBe(
      false
    );
  });

  test('detects MessageGears email opt-out origin in context', () => {
    expect(
      isMessageGearsEmailOptOutOrigin({
        consent_dispatch_origin: 'messagegears_email_optout'
      })
    ).toBe(true);
    expect(isMessageGearsEmailOptOutOrigin({ consent_dispatch_origin: 'vibes_sms_optout' })).toBe(
      false
    );
  });

  test('builds context marker for Ketch updates', () => {
    expect(buildVibesSmsOptOutContext()).toEqual({
      consent_dispatch_origin: 'vibes_sms_optout'
    });
  });
});
