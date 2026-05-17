const { getClientIp, normalizeIp } = require('../../src/services/clientIp');

describe('clientIp', () => {
  test('normalizeIp returns empty string for falsy values', () => {
    expect(normalizeIp()).toBe('');
    expect(normalizeIp('')).toBe('');
  });

  test('normalizeIp strips IPv4-mapped IPv6 prefix', () => {
    expect(normalizeIp('::ffff:203.0.113.4')).toBe('203.0.113.4');
  });

  test('getClientIp prefers the first X-Forwarded-For address', () => {
    const req = {
      get: (name) => (name.toLowerCase() === 'x-forwarded-for' ? '203.0.113.4, 10.0.0.1' : undefined),
      ip: '127.0.0.1'
    };

    expect(getClientIp(req)).toBe('203.0.113.4');
  });

  test('getClientIp falls back to req.ip', () => {
    const req = {
      get: () => undefined,
      ip: '::ffff:127.0.0.1'
    };

    expect(getClientIp(req)).toBe('127.0.0.1');
  });

  test('getClientIp returns empty string when no address is available', () => {
    const req = {
      get: () => undefined
    };

    expect(getClientIp(req)).toBe('');
  });

  test('getClientIp falls back to the socket remote address', () => {
    const req = {
      get: () => undefined,
      socket: { remoteAddress: '::ffff:10.0.0.8' }
    };

    expect(getClientIp(req)).toBe('10.0.0.8');
  });
});
