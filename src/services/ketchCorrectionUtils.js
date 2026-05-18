const CORRECTION_KINDS = new Set(['CorrectionRequest', 'CorrectionStatusEvent']);

/** Ketch uses `request` for inbound messages and `event` for status updates. */
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
  getEnvelopeSection
};
