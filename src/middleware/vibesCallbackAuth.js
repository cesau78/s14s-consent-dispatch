/**
 * Vibes callback shared-secret auth (VIBES_CALLBACK_AUTH_HEADER / VIBES_CALLBACK_AUTH_VALUE).
 */
const config = require('../config');
const { LOCAL_DEV_CALLBACK_AUTH_VALUE } = require('../config');
const { isLocalDevCaller } = require('../services/clientIp');

/**
 * vibesCallbackAuth — Express middleware (same control flow as ketchCallbackAuth).
 *
 * Sequence:
 *   1. No configured auth value → 401
 *   2. Header mismatch → 401
 *   3. Local-dev token from non-local peer → 403
 *   4. next()
 */
function vibesCallbackAuth(req, res, next) {
  const expected = config.vibesCallbackAuthValue;
  if (!expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const headerValue = req.get(config.vibesCallbackAuthHeader);
  if (headerValue !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (expected === LOCAL_DEV_CALLBACK_AUTH_VALUE && !isLocalDevCaller(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

module.exports = vibesCallbackAuth;
