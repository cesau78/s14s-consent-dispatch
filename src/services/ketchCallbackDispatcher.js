/**
 * Central router for all inbound Ketch Forwarder POST bodies (by body.kind).
 */
const { buildDispatchResponse } = require('./callbackResponse');
const { CORRECTION_KINDS, CONSENT_KINDS } = require('./ketchCorrectionUtils');
const { processPhoneCorrection } = require('../callback-handlers/ketchPhoneCallbackHandler');
const { processEmailCorrection } = require('../callback-handlers/ketchEmailCallbackHandler');
const { processConsentRequest } = require('../callback-handlers/ketchConsentCallbackHandler');

/**
 * dispatchKetchCallback — route body.kind to the correct handler.
 *
 * Sequence:
 *   1. Require body.kind — missing → throw 400
 *   2. ConsentRequest → processConsentRequest (stop)
 *   3. Not a correction kind → empty downstream (stop)
 *   4. processPhoneCorrection — returned result → stop (phone wins over email)
 *   5. processEmailCorrection — returned result → stop
 *   6. No phone or email in correction → empty downstream
 */
async function dispatchKetchCallback(body) {
  // 1.
  const kind = body && body.kind;
  if (!kind) {
    const error = new Error('Missing Ketch message kind');
    error.status = 400;
    throw error;
  }

  // 2. Consent path (marketing opt-out, not identity correction)
  if (CONSENT_KINDS.has(kind)) {
    return processConsentRequest(body);
  }

  // 3. Unknown / unsupported kinds — acknowledge without downstream work
  if (!CORRECTION_KINDS.has(kind)) {
    return buildDispatchResponse();
  }

  // 4. Correction path: phone first
  const phoneResult = await processPhoneCorrection(body);
  if (phoneResult) {
    return phoneResult;
  }

  // 5. Same payload may carry email if phone was absent
  const emailResult = await processEmailCorrection(body);
  if (emailResult) {
    return emailResult;
  }

  // 6. Correction kind but no extractable phone or email
  return buildDispatchResponse();
}

module.exports = {
  dispatchKetchCallback
};
