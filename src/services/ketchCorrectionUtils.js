/** CorrectionRequest and CorrectionStatusEvent — identity sync to Vibes / MessageGears. */
const CORRECTION_KINDS = new Set(['CorrectionRequest', 'CorrectionStatusEvent']);

/** ConsentRequest — marketing opt-out propagation. */
const CONSENT_KINDS = new Set(['ConsentRequest']);

/**
 * getEnvelopeSection — Ketch puts payload under request (inbound) or event (status).
 * Returns null if neither is an object.
 */
function getEnvelopeSection(body) {
  if (body && typeof body.request === 'object') {
    return body.request;
  }
  if (body && typeof body.event === 'object') {
    return body.event;
  }
  return null;
}

module.exports = {
  CORRECTION_KINDS,
  CONSENT_KINDS,
  getEnvelopeSection
};
