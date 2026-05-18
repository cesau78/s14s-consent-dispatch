/**
 * Normalize phone numbers to E.164 for Vibes API v2 (e.g. +12145551234).
 */
const { parsePhoneNumberFromString } = require('libphonenumber-js');

function normalizePhoneToE164(rawPhone, defaultCountry = 'US') {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return null;
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    return null;
  }

  return parsed.format('E.164');
}

module.exports = {
  normalizePhoneToE164
};
