/**
 * Validate the shared header secret on inbound Ketch webhooks. Ketch sends this from
 * their servers only; it is not exposed to end-user browsers.
 *
 * When no secret is configured (local dev), only localhost callers are accepted.
 */
const config = require('../config');
const { getClientIp, isLocalhost } = require('../services/clientIp');

function ketchWebhookAuth(req, res, next) {
  if (config.ketchWebhookAuthValue) {
    const headerValue = req.get(config.ketchWebhookAuthHeader);
    if (headerValue !== config.ketchWebhookAuthValue) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  }

  const clientIp = getClientIp(req);
  if (!isLocalhost(clientIp)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

module.exports = ketchWebhookAuth;
