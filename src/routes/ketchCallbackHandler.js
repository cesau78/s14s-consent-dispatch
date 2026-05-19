/**
 * HTTP adapter: Ketch Forwarder POST → dispatchKetchCallback → JSON response.
 */
const { dispatchKetchCallback } = require('../services/ketchCallbackDispatcher');

/**
 * ketchCallbackHandler — try/catch wrapper; errors go to app.js error middleware.
 */
async function ketchCallbackHandler(req, res, next) {
  try {
    const result = await dispatchKetchCallback(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
}

module.exports = ketchCallbackHandler;
