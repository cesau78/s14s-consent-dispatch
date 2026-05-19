/**
 * Resolve client IP for callback allowlisting (honors X-Forwarded-For when trust proxy is set).
 */

/** normalizeIp — strip ::ffff: prefix from IPv4-mapped addresses. */
function normalizeIp(ip) {
  if (!ip) {
    return '';
  }

  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  return ip;
}

/** getClientIp — first X-Forwarded-For hop, else req.ip / socket (for allowlists). */
function getClientIp(req) {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return normalizeIp(forwarded.split(',')[0].trim());
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

/** getDirectClientIp — TCP peer only; used for local-dev auth (not spoofable via headers). */
function getDirectClientIp(req) {
  return normalizeIp(req.socket?.remoteAddress || req.ip || '');
}

function isLocalhost(clientIp) {
  const normalized = normalizeIp(clientIp);
  return normalized === '127.0.0.1' || normalized === '::1';
}

/** isLocalMachinePeer — loopback or RFC1918 (Docker / host bridge). */
function isLocalMachinePeer(clientIp) {
  const normalized = normalizeIp(clientIp);
  if (isLocalhost(normalized)) {
    return true;
  }

  const octets = normalized.split('.').map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isFinite(n))) {
    return false;
  }

  const [a, b] = octets;
  if (a === 10) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }

  return false;
}

/** isLocalDevCaller — direct peer must be local when using Bearer local-dev auth value. */
function isLocalDevCaller(req) {
  return isLocalMachinePeer(getDirectClientIp(req));
}

module.exports = {
  getClientIp,
  getDirectClientIp,
  normalizeIp,
  isLocalhost,
  isLocalMachinePeer,
  isLocalDevCaller
};
