/**
 * Routes Ketch Forwarder correction callbacks to Vibes (phone) or MessageGears (email).
 * Phone takes precedence when both are present in the payload.
 */
const { buildDispatchResponse } = require('./callbackResponse');
const { CORRECTION_KINDS } = require('./ketchCorrectionUtils');
const { processPhoneCorrection } = require('../callback-handlers/ketchPhoneCallbackHandler');
const { processEmailCorrection } = require('../callback-handlers/ketchEmailCallbackHandler');

async function dispatchKetchCallback(body) {
  const kind = body && body.kind;
  if (!kind) {
    const error = new Error('Missing Ketch message kind');
    error.status = 400;
    throw error;
  }

  if (!CORRECTION_KINDS.has(kind)) {
    return buildDispatchResponse();
  }

  const phoneResult = await processPhoneCorrection(body);
  if (phoneResult) {
    return phoneResult;
  }

  const emailResult = await processEmailCorrection(body);
  if (emailResult) {
    return emailResult;
  }

  return buildDispatchResponse();
}

module.exports = {
  dispatchKetchCallback
};
