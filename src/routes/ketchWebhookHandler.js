/**
 * HTTP adapter for Ketch Forwarder POSTs. Delegates to callback-handlers and maps
 * their { status, body } result onto the Express response.
 */
const { handleKetchPhoneCallback } = require('../callback-handlers/ketchPhoneCallbackHandler');

async function ketchWebhookHandler(req, res, next) {
  try {
    const result = await handleKetchPhoneCallback(req.body);
    if (result.body) {
      // CorrectionRequest returns a JSON CorrectionResponse body.
      return res.status(result.status).json(result.body);
    }
    return res.sendStatus(result.status);
  } catch (error) {
    return next(error);
  }
}

module.exports = ketchWebhookHandler;
