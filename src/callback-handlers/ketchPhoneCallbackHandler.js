/**
 * Ketch Forwarder: phone corrections → Vibes Mobile Database person update.
 */
const {
  buildDownstreamEntry,
  buildDispatchResponse
} = require('../services/callbackResponse');
const { parsePhoneChangePayload } = require('../services/ketchPayloadParser');
const vibesClient = require('../services/vibesClient');

/**
 * processPhoneCorrection — first correction handler; email is skipped when this returns.
 *
 * Sequence:
 *   1. parsePhoneChangePayload — no phone in payload → return null
 *   2. Require Vibes person_key or external_person_id → else 422
 *   3. vibesClient.updatePersonPhone (PUT or POST)
 *   4. Return 200 + downstream[{ system: Vibes, update: status }]
 */
async function processPhoneCorrection(body) {
  // 1. identities → context → subject (first E.164 phone wins)
  const phoneChange = parsePhoneChangePayload(body);
  if (!phoneChange) {
    return null;
  }

  // 2. Downstream API needs at least one person identifier
  if (!phoneChange.personKey && !phoneChange.externalPersonId) {
    const error = new Error(
      'Phone change received but no Vibes person_key or external_person_id identity was found'
    );
    error.status = 422;
    throw error;
  }

  // 3–4. Sync to Vibes and record outcome for Ketch Forwarder
  const downstreamResult = await vibesClient.updatePersonPhone(phoneChange);

  return buildDispatchResponse([
    buildDownstreamEntry('Vibes', downstreamResult.status)
  ]);
}

module.exports = {
  processPhoneCorrection
};
