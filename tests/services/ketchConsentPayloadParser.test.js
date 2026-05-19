const { parseConsentDispatchPayload } = require('../../src/services/ketchConsentPayloadParser');

describe('ketchConsentPayloadParser', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('parses sms denied consent with person_key', () => {
    const result = parseConsentDispatchPayload({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'person_key', identityValue: 'person-123' }],
        purposes: { sms_mktg: 'denied' }
      }
    });

    expect(result).toEqual({
      sms: { personKey: 'person-123', skipVibes: false },
      email: null
    });
  });

  test('parses email denied consent with recipient_id', () => {
    const result = parseConsentDispatchPayload({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' }],
        purposes: { email_mktg: 'denied' }
      }
    });

    expect(result).toEqual({
      sms: null,
      email: {
        recipientId: 'mg-recipient-abc123',
        externalRecipientId: null,
        skipMessageGears: false
      }
    });
  });

  test('parses both sms and email opt-out in one request', () => {
    const result = parseConsentDispatchPayload({
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

    expect(result.sms.personKey).toBe('person-123');
    expect(result.email.recipientId).toBe('mg-recipient-abc123');
  });

  test('skips Vibes when origin context is from Vibes SMS', () => {
    const result = parseConsentDispatchPayload({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'person_key', identityValue: 'person-123' }],
        purposes: { sms_mktg: 'denied' },
        context: { consent_dispatch_origin: 'vibes_sms_optout' }
      }
    });

    expect(result.sms.skipVibes).toBe(true);
  });

  test('skips MessageGears when origin context is from MessageGears email', () => {
    const result = parseConsentDispatchPayload({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' }],
        purposes: { email_mktg: 'denied' },
        context: { consent_dispatch_origin: 'messagegears_email_optout' }
      }
    });

    expect(result.email.skipMessageGears).toBe(true);
  });

  test('ignores sms identities without matching spaces or values', () => {
    expect(
      parseConsentDispatchPayload({
        kind: 'ConsentRequest',
        request: {
          identities: [
            { identitySpace: 'email', identityValue: 'a@example.com' },
            { identitySpace: 'person_key', identityValue: '' }
          ],
          purposes: { sms_mktg: 'denied' }
        }
      })
    ).toBeNull();
  });

  test('returns null when identities is not an array', () => {
    expect(
      parseConsentDispatchPayload({
        kind: 'ConsentRequest',
        request: {
          identities: 'not-an-array',
          purposes: { sms_mktg: 'denied' }
        }
      })
    ).toBeNull();
    expect(
      parseConsentDispatchPayload({
        kind: 'ConsentRequest',
        request: {
          identities: 'not-an-array',
          purposes: { email_mktg: 'denied' }
        }
      })
    ).toBeNull();
  });

  test('returns null without envelope section or resolvable downstream ids', () => {
    expect(parseConsentDispatchPayload({ kind: 'ConsentRequest' })).toBeNull();
    expect(
      parseConsentDispatchPayload({
        kind: 'ConsentRequest',
        request: {
          identities: [{ identitySpace: 'phone', identityValue: '+12145551234' }],
          purposes: { sms_mktg: 'denied' }
        }
      })
    ).toBeNull();
    expect(
      parseConsentDispatchPayload({
        kind: 'ConsentRequest',
        request: {
          identities: [{ identitySpace: 'email', identityValue: 'only-email@example.com' }],
          purposes: { email_mktg: 'denied' }
        }
      })
    ).toBeNull();
  });

  test('resolves person_key across multiple configured identity spaces', () => {
    process.env.KETCH_VIBES_PERSON_KEY_IDENTITY_SPACES = 'vibes_person_key,person_key';
    jest.resetModules();
    const { parseConsentDispatchPayload: parse } = require('../../src/services/ketchConsentPayloadParser');

    const result = parse({
      kind: 'ConsentRequest',
      request: {
        identities: [
          { identityValue: 'missing-space' },
          { identitySpace: 'person_key', identityValue: 'person-123' }
        ],
        purposes: { sms_mktg: 'denied' }
      }
    });

    expect(result.sms.personKey).toBe('person-123');
  });

  test('matches alternate sms purpose codes and identity spaces', () => {
    process.env.KETCH_SMS_MARKETING_PURPOSE_CODES = 'custom_sms';
    jest.resetModules();
    const { parseConsentDispatchPayload: parse } = require('../../src/services/ketchConsentPayloadParser');

    const result = parse({
      kind: 'ConsentRequest',
      request: {
        identities: [{ identitySpace: 'vibes_person_key', identityValue: 'person-999' }],
        purposes: { CUSTOM_SMS: 'denied' }
      }
    });

    expect(result.sms).toEqual({
      personKey: 'person-999',
      skipVibes: false
    });
  });

  test('resolves external recipient id for email opt-out', () => {
    const result = parseConsentDispatchPayload({
      kind: 'ConsentRequest',
      request: {
        identities: [
          { identitySpace: 'account_id', identityValue: '' },
          { identitySpace: 'account_id', identityValue: 'crm-customer-99' }
        ],
        purposes: { email_mktg: 'denied' }
      }
    });

    expect(result.email).toEqual({
      recipientId: null,
      externalRecipientId: 'crm-customer-99',
      skipMessageGears: false
    });
  });

  test('ignores email identities without matching spaces or values', () => {
    expect(
      parseConsentDispatchPayload({
        kind: 'ConsentRequest',
        request: {
          identities: [
            { identitySpace: 'recipient_id', identityValue: '' },
            { identitySpace: 'email', identityValue: 'only@example.com' }
          ],
          purposes: { email_mktg: 'denied' }
        }
      })
    ).toBeNull();
  });

  test('returns null when no marketing purpose is denied', () => {
    expect(
      parseConsentDispatchPayload({
        kind: 'ConsentRequest',
        request: {
          identities: [{ identitySpace: 'person_key', identityValue: 'person-123' }],
          purposes: { sms_mktg: 'granted', email_mktg: 'granted' }
        }
      })
    ).toBeNull();
  });
});
