const { handleKetchPhoneCallback } = require('../callback-handlers/ketchPhoneCallbackHandler');

async function ketchWebhookHandler(req, res, next) {
  try {
    const result = await handleKetchPhoneCallback(req.body);
    if (result.body) {
      return res.status(result.status).json(result.body);
    }
    return res.sendStatus(result.status);
  } catch (error) {
    return next(error);
  }
}

module.exports = ketchWebhookHandler;
