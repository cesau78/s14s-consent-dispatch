const { normalizeEmail } = require('../../src/services/emailNormalizer');

describe('emailNormalizer', () => {
  test('normalizeEmail returns null for invalid values', () => {
    expect(normalizeEmail()).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('not-an-email')).toBeNull();
  });

  test('normalizeEmail lowercases and trims valid addresses', () => {
    expect(normalizeEmail('  Subscriber@Example.com ')).toBe('subscriber@example.com');
  });
});
