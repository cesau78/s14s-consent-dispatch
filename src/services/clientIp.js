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

function isLocalhost(clientIp) {
  const normalized = normalizeIp(clientIp);
  return normalized === '127.0.0.1' || normalized === '::1';
}

module.exports = {
  getClientIp,
  normalizeIp,
  isLocalhost
};
