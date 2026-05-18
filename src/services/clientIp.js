/**
 * Resolve the caller IP for webhook allowlisting, including behind a reverse proxy.
 */

function normalizeIp(ip) {
  if (!ip) {
    return '';
  }

  // Express often reports IPv4 clients as ::ffff:x.x.x.x
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  return ip;
}

function getClientIp(req) {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    // First address is the original client when proxies append to the chain.
    return normalizeIp(forwarded.split(',')[0].trim());
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

/** TCP peer only — ignores X-Forwarded-For (cannot be spoofed by the HTTP client). */
function getDirectClientIp(req) {
  return normalizeIp(req.socket?.remoteAddress || req.ip || '');
}

function isLocalhost(clientIp) {
  const normalized = normalizeIp(clientIp);
  return normalized === '127.0.0.1' || normalized === '::1';
}

/**
 * True when the direct TCP peer is loopback or a Docker/host bridge address
 * (host → published container port). Not used for production webhook auth.
 */
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
