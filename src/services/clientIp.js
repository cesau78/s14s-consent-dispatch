function normalizeIp(ip) {
  if (!ip) {
    return '';
  }

  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  return ip;
}

function getClientIp(req) {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return normalizeIp(forwarded.split(',')[0].trim());
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

module.exports = {
  getClientIp,
  normalizeIp
};
