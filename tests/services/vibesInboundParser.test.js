const { parseSmsOptOutPayload, isOptOutKeyword } = require('../../src/services/vibesInboundParser');

describe('vibesInboundParser', () => {
  test('matches configured opt-out keyword', () => {
    expect(isOptOutKeyword('no')).toBe(true);
    expect(isOptOutKeyword(' NO ')).toBe(true);
    expect(isOptOutKeyword('yes')).toBe(false);
  });

  test('reads fields when only case-insensitive keys are present', () => {
    const result = parseSmsOptOutPayload({
      Person_Key: 'person-case',
      MESSAGE: 'no',
      MESSAGE_TYPE: 'MO'
    });

    expect(result.personKey).toBe('person-case');
  });

  test('parses MO opt-out payload with person_key and phone', () => {
    const result = parseSmsOptOutPayload({
      person_key: 'person-123',
      phone_number_e164_format: '+12145551234',
      message: 'no',
      message_type: 'MO'
    });

    expect(result).toEqual({
      personKey: 'person-123',
      phone: '+12145551234',
      message: 'no',
      messageType: 'MO'
    });
  });

  test('returns null for MT messages', () => {
    expect(
      parseSmsOptOutPayload({
        person_key: 'person-123',
        message: 'no',
        message_type: 'MT'
      })
    ).toBeNull();
  });

  test('reads nested message payloads and camelCase fields', () => {
    const fromData = parseSmsOptOutPayload({
      data: {
        personKey: 'person-456',
        phoneNumberE164Format: '+12145559999',
        message: 'no',
        messageType: 'MO'
      }
    });

    expect(fromData.personKey).toBe('person-456');
    expect(fromData.phone).toBe('+12145559999');

    const fromMessageObject = parseSmsOptOutPayload({
      message: {
        person_key: 'person-789',
        message: 'no',
        message_type: 'MO'
      }
    });

    expect(fromMessageObject.personKey).toBe('person-789');
  });

  test('returns null for empty payloads', () => {
    expect(parseSmsOptOutPayload(null)).toBeNull();
    expect(parseSmsOptOutPayload({})).toBeNull();
  });

  test('defaults message type to MO when omitted', () => {
    const result = parseSmsOptOutPayload({
      person_key: 'person-123',
      message: 'no'
    });

    expect(result.messageType).toBe('MO');
  });

  test('allows phone-only opt-out payloads', () => {
    const result = parseSmsOptOutPayload({
      phone_number_e164_format: '+12145551234',
      message: 'no',
      message_type: 'MO'
    });

    expect(result).toEqual({
      personKey: null,
      phone: '+12145551234',
      message: 'no',
      messageType: 'MO'
    });
  });

  test('allows person_key without a normalized phone', () => {
    const result = parseSmsOptOutPayload({
      person_key: 'person-only',
      message: 'no',
      message_type: 'MO'
    });

    expect(result).toEqual({
      personKey: 'person-only',
      phone: null,
      message: 'no',
      messageType: 'MO'
    });
  });

  test('returns null without person_key or phone', () => {
    expect(
      parseSmsOptOutPayload({
        message: 'no',
        message_type: 'MO'
      })
    ).toBeNull();
  });

  test('returns null when keyword does not match', () => {
    expect(
      parseSmsOptOutPayload({
        person_key: 'person-123',
        message: 'hello',
        message_type: 'MO'
      })
    ).toBeNull();
  });
});
