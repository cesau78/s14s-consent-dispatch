/**
 * HTTP adapter for Ketch Forwarder POSTs. Delegates to callback-handlers and maps
 * their { status, body } result onto the Express response.
 */
const { dispatchKetchCallback } = require('../services/ketchCallbackDispatcher');

async function ketchCallbackHandler(req, res, next) {
  try {
    const result = await dispatchKetchCallback(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
}

module.exports = ketchCallbackHandler;
