/**
 * Validate the shared header secret on inbound Ketch webhooks. Ketch sends this from
 * their servers only; it is not exposed to end-user browsers.
 *
 * Local dev uses KETCH_WEBHOOK_AUTH_VALUE=Bearer local-dev, which also requires the
 * direct TCP peer to be loopback or a Docker bridge address (X-Forwarded-For is ignored
 * so the header cannot be used from the public internet).
 */
const config = require('../config');
const { LOCAL_DEV_WEBHOOK_AUTH_VALUE } = require('../config');
const { isLocalDevCaller } = require('../services/clientIp');

function ketchWebhookAuth(req, res, next) {
  const expected = config.ketchWebhookAuthValue;
  if (!expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const headerValue = req.get(config.ketchWebhookAuthHeader);
  if (headerValue !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (expected === LOCAL_DEV_WEBHOOK_AUTH_VALUE && !isLocalDevCaller(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

module.exports = ketchWebhookAuth;
