/**
 * Phone normalization for Vibes API v2 (E.164, default country US).
 */
const { parsePhoneNumberFromString } = require('libphonenumber-js');

/** normalizePhoneToE164 — valid E.164 string or null. */
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
