const { normalizePhoneToE164 } = require('../../src/services/phoneNormalizer');

describe('normalizePhoneToE164', () => {
  test('normalizes US numbers to E.164', () => {
    expect(normalizePhoneToE164('(214) 555-1234')).toBe('+12145551234');
  });

  test('returns null for invalid numbers', () => {
    expect(normalizePhoneToE164('not-a-phone')).toBeNull();
    expect(normalizePhoneToE164('')).toBeNull();
    expect(normalizePhoneToE164('   ')).toBeNull();
    expect(normalizePhoneToE164(null)).toBeNull();
  });
});
