const { isIpAllowed, addAllowedEntry } = require('../../src/services/ipAllowlist');
const { BlockList } = require('net');

describe('isIpAllowed', () => {
  test('denies all IPs when the allowlist is empty', () => {
    expect(isIpAllowed('203.0.113.4', [])).toBe(false);
    expect(isIpAllowed('127.0.0.1', [])).toBe(false);
  });

  test('matches exact IPv4 addresses', () => {
    expect(isIpAllowed('203.0.113.4', ['203.0.113.4'])).toBe(true);
    expect(isIpAllowed('203.0.113.5', ['203.0.113.4'])).toBe(false);
  });

  test('matches IPv4 CIDR ranges', () => {
    expect(isIpAllowed('198.51.100.42', ['198.51.100.0/24'])).toBe(true);
    expect(isIpAllowed('198.51.101.1', ['198.51.100.0/24'])).toBe(false);
  });

  test('matches IPv4-mapped client addresses against IPv4 allowlist entries', () => {
    expect(isIpAllowed('::ffff:127.0.0.1', ['127.0.0.1'])).toBe(true);
  });

  test('rejects empty client IPs when an allowlist is configured', () => {
    expect(isIpAllowed('', ['127.0.0.1'])).toBe(false);
  });

  test('supports IPv6 addresses and rejects invalid CIDR entries', () => {
    expect(isIpAllowed('::1', ['::1/128'])).toBe(true);

    const blockList = new BlockList();
    expect(() => addAllowedEntry(blockList, '10.0.0.0/not-a-prefix')).toThrow('Invalid CIDR entry');
  });

  test('ignores blank allowlist entries', () => {
    const blockList = new BlockList();
    addAllowedEntry(blockList, '   ');
    expect(blockList.rules).toHaveLength(0);
  });
});
