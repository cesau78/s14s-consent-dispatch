const config = require('../config');
const { getClientIp } = require('../services/clientIp');
const { isIpAllowed } = require('../services/ipAllowlist');

function ketchWebhookGuard(req, res, next) {
  const clientIp = getClientIp(req);

  if (!isIpAllowed(clientIp, config.ketchAllowedIps)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (config.ketchWebhookAuthValue) {
    const headerValue = req.get(config.ketchWebhookAuthHeader);
    if (headerValue !== config.ketchWebhookAuthValue) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  return next();
}

module.exports = ketchWebhookGuard;
