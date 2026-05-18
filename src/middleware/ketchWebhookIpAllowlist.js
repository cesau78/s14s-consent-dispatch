/**
 * Restrict inbound Ketch webhooks to configured caller IPs/CIDRs (KETCH_ALLOWED_IPS).
 * When the allowlist is empty, all IPs are permitted.
 */
const config = require('../config');
const { getClientIp } = require('../services/clientIp');
const { isIpAllowed } = require('../services/ipAllowlist');

function ketchWebhookIpAllowlist(req, res, next) {
  const clientIp = getClientIp(req);

  if (!isIpAllowed(clientIp, config.ketchAllowedIps)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

module.exports = ketchWebhookIpAllowlist;
