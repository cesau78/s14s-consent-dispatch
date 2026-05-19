/**
 * Parse inbound Vibes MO callbacks for SMS opt-out keywords (VIBES_SMS_OPT_OUT_KEYWORDS).
 * Supports snake_case / camelCase and nesting under message or data.
 */
const config = require('../config');
const { normalizePhoneToE164 } = require('./phoneNormalizer');

/** readField — first matching key on body (case-insensitive). */
function readField(body, ...keys) {
  if (!body || typeof body !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] != null) {
      return body[key];
    }

    const match = Object.keys(body).find(
      (entry) => entry.toLowerCase() === String(key).toLowerCase()
    );
    if (match && body[match] != null) {
      return body[match];
    }
  }

  return null;
}

/** normalizeMessageType — trim and uppercase (e.g. "mo" → "MO"). */
function normalizeMessageType(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

/**
 * isOptOutKeyword — exact match against VIBES_SMS_OPT_OUT_KEYWORDS (case-insensitive).
 */
function isOptOutKeyword(message) {
  const normalized = String(message || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return false;
  }

  return config.vibesSmsOptOutKeywords.some((keyword) => normalized === keyword);
}

/**
 * parseSmsOptOutPayload — decide if this Vibes callback should update Ketch.
 *
 * Sequence:
 *   1. Unwrap body.message or body.data if present
 *   2. If message_type is set and not MO → null (ignore MT / other)
 *   3. If message text is not an opt-out keyword → null
 *   4. Require person_key and/or normalizable phone → null if neither
 *   5. Return { personKey, phone, message, messageType }
 */
function parseSmsOptOutPayload(body) {
  // 1.
  const nested =
    (body && typeof body.message === 'object' && body.message) ||
    (body && typeof body.data === 'object' && body.data) ||
    body;

  const message = readField(nested, 'message', 'MESSAGE', 'body', 'text');
  const messageType = normalizeMessageType(
    readField(nested, 'message_type', 'messageType', 'MESSAGE_TYPE')
  );

  // 2.
  if (messageType && messageType !== 'MO') {
    return null;
  }

  // 3.
  if (!isOptOutKeyword(message)) {
    return null;
  }

  const personKey = readField(
    nested,
    'person_key',
    'personKey',
    'PERSON_KEY'
  );
  const phoneRaw = readField(
    nested,
    'phone_number_e164_format',
    'phoneNumberE164Format',
    'PHONE_NUMBER_E164_FORMAT',
    'phone_number',
    'phoneNumber',
    'PHONE_NUMBER',
    'mdn',
    'MDN'
  );

  const phone = normalizePhoneToE164(
    phoneRaw == null ? null : String(phoneRaw)
  );

  // 4.
  if (!personKey && !phone) {
    return null;
  }

  // 5.
  return {
    personKey: personKey ? String(personKey) : null,
    phone,
    message: String(message).trim(),
    messageType: messageType || 'MO'
  };
}

module.exports = {
  parseSmsOptOutPayload,
  isOptOutKeyword
};
