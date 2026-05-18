/**
 * Validate the shared header secret on inbound Ketch callbacks. Ketch sends this from
 * their servers only; it is not exposed to end-user browsers.
 *
 * Local dev uses KETCH_CALLBACK_AUTH_VALUE=Bearer local-dev, which also requires the
 * direct TCP peer to be loopback or a Docker bridge address (X-Forwarded-For is ignored
 * so the header cannot be used from the public internet).
 */
const config = require('../config');
const { LOCAL_DEV_CALLBACK_AUTH_VALUE } = require('../config');
const { isLocalDevCaller } = require('../services/clientIp');

function ketchCallbackAuth(req, res, next) {
  const expected = config.ketchCallbackAuthValue;
  if (!expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const headerValue = req.get(config.ketchCallbackAuthHeader);
  if (headerValue !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (expected === LOCAL_DEV_CALLBACK_AUTH_VALUE && !isLocalDevCaller(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

module.exports = ketchCallbackAuth;
