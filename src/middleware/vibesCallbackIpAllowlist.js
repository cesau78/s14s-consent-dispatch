/**
 * Vibes callback IP allowlist (VIBES_ALLOWED_IPS). Empty or unset = deny all.
 */
const config = require('../config');
const { getClientIp } = require('../services/clientIp');
const { isIpAllowed } = require('../services/ipAllowlist');

/**
 * vibesCallbackIpAllowlist — Express middleware.
 *
 * Sequence: getClientIp → isIpAllowed → 403 or next()
 */
function vibesCallbackIpAllowlist(req, res, next) {
  const clientIp = getClientIp(req);

  if (!isIpAllowed(clientIp, config.vibesAllowedIps)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

module.exports = vibesCallbackIpAllowlist;
