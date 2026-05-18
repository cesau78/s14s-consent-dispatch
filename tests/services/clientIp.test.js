const {
  getClientIp,
  getDirectClientIp,
  normalizeIp,
  isLocalhost,
  isLocalMachinePeer,
  isLocalDevCaller
} = require('../../src/services/clientIp');

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

  test('isLocalhost recognizes loopback addresses', () => {
    expect(isLocalhost('127.0.0.1')).toBe(true);
    expect(isLocalhost('::1')).toBe(true);
    expect(isLocalhost('::ffff:127.0.0.1')).toBe(true);
    expect(isLocalhost('10.0.0.1')).toBe(false);
  });

  test('getClientIp falls back to the socket remote address', () => {
    const req = {
      get: () => undefined,
      socket: { remoteAddress: '::ffff:10.0.0.8' }
    };

    expect(getClientIp(req)).toBe('10.0.0.8');
  });

  test('getDirectClientIp returns empty string when no peer address is available', () => {
    const req = { get: () => undefined };
    expect(getDirectClientIp(req)).toBe('');
  });

  test('getDirectClientIp falls back to req.ip when socket address is missing', () => {
    const req = {
      get: () => undefined,
      ip: '::ffff:172.17.0.1'
    };

    expect(getDirectClientIp(req)).toBe('172.17.0.1');
  });

  test('getDirectClientIp ignores X-Forwarded-For', () => {
    const req = {
      get: (name) =>
        name.toLowerCase() === 'x-forwarded-for' ? '127.0.0.1' : undefined,
      ip: '203.0.113.10',
      socket: { remoteAddress: '::ffff:203.0.113.10' }
    };

    expect(getDirectClientIp(req)).toBe('203.0.113.10');
  });

  test('isLocalMachinePeer accepts loopback and Docker bridge ranges', () => {
    expect(isLocalMachinePeer('127.0.0.1')).toBe(true);
    expect(isLocalMachinePeer('10.0.0.8')).toBe(true);
    expect(isLocalMachinePeer('172.17.0.1')).toBe(true);
    expect(isLocalMachinePeer('192.168.65.1')).toBe(true);
    expect(isLocalMachinePeer('203.0.113.10')).toBe(false);
    expect(isLocalMachinePeer('not-an-ip')).toBe(false);
    expect(isLocalMachinePeer('1.2.3')).toBe(false);
  });

  test('isLocalDevCaller uses the direct TCP peer only', () => {
    const localReq = {
      get: () => undefined,
      socket: { remoteAddress: '::ffff:127.0.0.1' }
    };
    const spoofedReq = {
      get: (name) =>
        name.toLowerCase() === 'x-forwarded-for' ? '127.0.0.1' : undefined,
      socket: { remoteAddress: '::ffff:203.0.113.10' }
    };

    expect(isLocalDevCaller(localReq)).toBe(true);
    expect(isLocalDevCaller(spoofedReq)).toBe(false);
  });
});
