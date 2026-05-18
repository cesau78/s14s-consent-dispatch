const {
  parsePhoneChangePayload,
  parseEmailChangePayload,
  extractPhoneFromIdentities,
  extractPhoneFromContext,
  extractPhoneFromSubject,
  extractEmailFromIdentities,
  extractEmailFromContext,
  extractEmailFromSubject,
  extractPersonKey,
  extractExternalPersonId,
  extractExternalRecipientId,
  extractRecipientId,
  getEnvelopeSection,
  readContextValue
} = require('../../src/services/ketchPayloadParser');

describe('ketchPayloadParser', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('extracts phone and person key from correction request', () => {
    const payload = parsePhoneChangePayload({
      request: {
        identities: [
          {
            identitySpace: 'vibes_person_key',
            identityFormat: 'raw',
            identityValue: 'person-123'
          },
          {
            identitySpace: 'phone',
            identityFormat: 'raw',
            identityValue: '+12145551234'
          },
          {
            identitySpace: 'account_id',
            identityFormat: 'raw',
            identityValue: 'acct-9'
          }
        ]
      }
    });

    expect(payload).toEqual({
      phone: '+12145551234',
      personKey: 'person-123',
      externalPersonId: 'acct-9'
    });
  });

  test('reads phone from status event subject form data', () => {
    const payload = parsePhoneChangePayload({
      event: {
        identities: [
          {
            identitySpace: 'external_person_id',
            identityValue: 'crm-44'
          }
        ],
        subject: {
          formData: {
            mobile_phone: '2145559876'
          }
        }
      }
    });

    expect(payload).toEqual({
      phone: '+12145559876',
      personKey: null,
      externalPersonId: 'crm-44'
    });
  });

  test('returns null when no phone is present', () => {
    expect(
      parsePhoneChangePayload({
        request: {
          identities: [{ identitySpace: 'account_id', identityValue: '1' }]
        }
      })
    ).toBeNull();
  });

  test('getEnvelopeSection returns null when no envelope exists', () => {
    expect(getEnvelopeSection(null)).toBeNull();
    expect(getEnvelopeSection({ kind: 'CorrectionRequest' })).toBeNull();
  });

  test('extracts email and recipient id from correction request', () => {
    const payload = parseEmailChangePayload({
      request: {
        identities: [
          { identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' },
          { identitySpace: 'email', identityValue: 'Subscriber@Example.com' },
          { identitySpace: 'account_id', identityValue: 'acct-9' }
        ]
      }
    });

    expect(payload).toEqual({
      email: 'subscriber@example.com',
      recipientId: 'mg-recipient-abc123',
      externalRecipientId: 'acct-9'
    });
  });

  test('reads email from status event subject form data', () => {
    const payload = parseEmailChangePayload({
      event: {
        identities: [{ identitySpace: 'external_recipient_id', identityValue: 'crm-44' }],
        subject: {
          formData: {
            email_address: 'form.subscriber@example.com'
          }
        }
      }
    });

    expect(payload).toEqual({
      email: 'form.subscriber@example.com',
      recipientId: null,
      externalRecipientId: 'crm-44'
    });
  });

  test('returns null when no email is present', () => {
    expect(
      parseEmailChangePayload({
        request: {
          identities: [{ identitySpace: 'recipient_id', identityValue: 'mg-1' }]
        }
      })
    ).toBeNull();
  });

  test('extractEmailFromSubject reads direct fields and nested form data', () => {
    expect(extractEmailFromSubject(null)).toBeNull();
    expect(extractEmailFromSubject({ email: 'Direct@Example.com' })).toBe('direct@example.com');
    expect(
      extractEmailFromSubject({
        emailAddress: { toString: () => 'coerced@example.com' }
      })
    ).toBe('coerced@example.com');
    expect(
      extractEmailFromSubject({
        formData: {
          emailAddress: 'nested@example.com'
        }
      })
    ).toBe('nested@example.com');
    expect(extractEmailFromSubject({ phone: '+12145551234' })).toBeNull();
  });

  test('extractEmailFromContext coerces non-string values before normalization', () => {
    expect(extractEmailFromContext({ email: null })).toBeNull();
    expect(
      extractEmailFromContext({
        email_address: { toString: () => 'ctx@example.com' }
      })
    ).toBe('ctx@example.com');
  });

  test('extractRecipientId handles invalid inputs and identity spaces', () => {
    expect(extractRecipientId(null)).toBeNull();
    expect(
      extractRecipientId([{ identitySpace: 'recipient_id', identityValue: 'mg-recipient-abc123' }])
    ).toBe('mg-recipient-abc123');
    expect(extractRecipientId([{ identitySpace: 'recipient_id', identityValue: '' }])).toBeNull();
  });

  test('extractExternalRecipientId handles invalid inputs and identity spaces', () => {
    expect(extractExternalRecipientId(null)).toBeNull();
    expect(
      extractExternalRecipientId([
        { identitySpace: 'external_recipient_id', identityValue: 'crm-44' }
      ])
    ).toBe('crm-44');
    expect(
      extractExternalRecipientId([{ identitySpace: 'external_recipient_id', identityValue: '' }])
    ).toBeNull();
  });

  test('extractEmailFromIdentities handles invalid inputs and invalid emails', () => {
    expect(extractEmailFromIdentities(null)).toBeNull();
    expect(
      extractEmailFromIdentities([
        { identitySpace: 'email', identityValue: 'not-an-email' },
        { identitySpace: 'email', identityValue: 'valid@example.com' }
      ])
    ).toBe('valid@example.com');
  });

  test('parseEmailChangePayload returns null without a forwarder envelope', () => {
    expect(parseEmailChangePayload({ kind: 'CorrectionRequest' })).toBeNull();
  });

  test('extractEmailFromContext reads identity-space keys from entries', () => {
    process.env.KETCH_EMAIL_CONTEXT_KEYS = 'unused_email_context';
    process.env.KETCH_EMAIL_IDENTITY_SPACES = 'email_address';
    jest.resetModules();
    const { extractEmailFromContext: extractWithCustomConfig } = require('../../src/services/ketchPayloadParser');

    expect(extractWithCustomConfig({ email_address: 'scan@example.com' })).toBe('scan@example.com');
    expect(
      extractWithCustomConfig({
        email_address: { toString: () => 'object@example.com' }
      })
    ).toBe('object@example.com');
    expect(extractWithCustomConfig({ unused_email_context: 'ctx@example.com' })).toBe(
      'ctx@example.com'
    );
    expect(extractWithCustomConfig({ ignored: 'value' })).toBeNull();
  });

  test('extractPhoneFromIdentities handles invalid inputs and identity spaces', () => {
    expect(extractPhoneFromIdentities(null)).toBeNull();
    expect(
      extractPhoneFromIdentities([
        { identitySpace: 'account_id', identityValue: '1' },
        { identitySpace: 'phone', identityValue: 'not-a-phone' },
        { identitySpace: 'mobile', identityValue: '+12145551234' }
      ])
    ).toBe('+12145551234');
  });

  test('extractPersonKey and extractExternalPersonId handle invalid inputs', () => {
    expect(extractPersonKey(null)).toBeNull();
    expect(extractExternalPersonId(null)).toBeNull();
    expect(
      extractPersonKey([{ identitySpace: 'account_id', identityValue: 'ignored' }])
    ).toBeNull();
    expect(
      extractExternalPersonId([{ identitySpace: 'person_key', identityValue: 'person-1' }])
    ).toBeNull();
    expect(extractPersonKey([{ identitySpace: 'person_key', identityValue: '' }])).toBeNull();
    expect(
      extractExternalPersonId([{ identitySpace: 'external_person_id', identityValue: '' }])
    ).toBeNull();
  });

  test('extractPhoneFromIdentities ignores blank identity spaces and values', () => {
    expect(
      extractPhoneFromIdentities([
        { identitySpace: null, identityValue: '+12145551234' },
        { identitySpace: 'phone', identityValue: '' },
        { identitySpace: 'mobile', identityValue: '2145557777' }
      ])
    ).toBe('+12145557777');
  });

  test('extractPhoneFromContext reads configured and matching keys', () => {
    expect(extractPhoneFromContext(null)).toBeNull();
    expect(extractPhoneFromContext({ phone: '+12145551234' })).toBe('+12145551234');
    expect(extractPhoneFromContext({ MobilePhone: '2145551111' })).toBe('+12145551111');
    expect(extractPhoneFromContext({ mdn: 3125550198 })).toBe('+13125550198');
    expect(extractPhoneFromContext({ mobile: 2145552222 })).toBe('+12145552222');
    expect(extractPhoneFromContext({ mdn: 'not-a-phone' })).toBeNull();
    expect(extractPhoneFromContext({ mobilePhone: null })).toBeNull();
    expect(readContextValue(null, 'phone')).toBeNull();
  });

  test('extractPhoneFromSubject reads direct fields and nested form data', () => {
    expect(extractPhoneFromSubject(null)).toBeNull();
    expect(extractPhoneFromSubject({ phone: '2145553333' })).toBe('+12145553333');
    expect(extractPhoneFromSubject({ phone: null })).toBeNull();
    expect(extractPhoneFromSubject({ phone: 2145553333 })).toBe('+12145553333');
    expect(extractPhoneFromSubject({ mobilePhone: '2145554444' })).toBe('+12145554444');
    expect(extractPhoneFromSubject({ mobile_phone: '2145555555' })).toBe('+12145555555');
    expect(
      extractPhoneFromSubject({
        formData: {
          phone: 'invalid',
          mobilePhone: '2145556666'
        }
      })
    ).toBe('+12145556666');
    expect(extractPhoneFromSubject({ formData: { phone: 'not-a-phone' } })).toBeNull();
    expect(extractPhoneFromSubject({ formData: { unused: 'value' } })).toBeNull();
    expect(extractPhoneFromSubject({ email: 'only@example.com' })).toBeNull();
  });

  test('parsePhoneChangePayload returns null without a forwarder envelope', () => {
    expect(parsePhoneChangePayload({ kind: 'CorrectionRequest' })).toBeNull();
  });

  test('extractPhoneFromContext reads identity-space keys from entries', () => {
    process.env.KETCH_PHONE_CONTEXT_KEYS = 'unused_context_key';
    process.env.KETCH_PHONE_IDENTITY_SPACES = 'mobile';
    jest.resetModules();
    const { extractPhoneFromContext: extractWithCustomConfig } = require('../../src/services/ketchPayloadParser');

    expect(extractWithCustomConfig({ mobile: '2145552222' })).toBe('+12145552222');
    expect(extractWithCustomConfig({ unused_context_key: 2145553333 })).toBe('+12145553333');
    expect(extractWithCustomConfig({ ignored: 'value' })).toBeNull();
    expect(extractWithCustomConfig({ mdn: 'not-a-phone' })).toBeNull();
  });
});
