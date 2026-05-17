const { BlockList } = require('net');
const { normalizeIp } = require('./clientIp');

function parseIpFamily(ip) {
  if (ip.includes(':')) {
    return 'ipv6';
  }
  return 'ipv4';
}

function addAllowedEntry(blockList, entry) {
  const trimmed = entry.trim();
  if (!trimmed) {
    return;
  }

  if (trimmed.includes('/')) {
    const [address, prefixLength] = trimmed.split('/');
    const prefix = Number(prefixLength);
    if (!address || Number.isNaN(prefix)) {
      throw new Error(`Invalid CIDR entry: ${entry}`);
    }
    blockList.addSubnet(address, prefix, parseIpFamily(address));
    return;
  }

  blockList.addAddress(trimmed, parseIpFamily(trimmed));
}

function createAllowlist(entries) {
  const blockList = new BlockList();
  for (const entry of entries) {
    addAllowedEntry(blockList, entry);
  }
  return blockList;
}

function isIpAllowed(clientIp, allowedEntries) {
  if (!allowedEntries.length) {
    return true;
  }

  const normalized = normalizeIp(clientIp);
  if (!normalized) {
    return false;
  }

  const blockList = createAllowlist(allowedEntries);
  return blockList.check(normalized, parseIpFamily(normalized));
}

module.exports = {
  isIpAllowed,
  createAllowlist,
  addAllowedEntry
};
