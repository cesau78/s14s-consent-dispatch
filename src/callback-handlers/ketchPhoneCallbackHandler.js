/**
 * Ketch Forwarder callback-handler: phone number corrections → Vibes Mobile DB.
 */
const {
  buildDownstreamEntry,
  buildDispatchResponse
} = require('../services/callbackResponse');
const { parsePhoneChangePayload } = require('../services/ketchPayloadParser');
const vibesClient = require('../services/vibesClient');

async function processPhoneCorrection(body) {
  const phoneChange = parsePhoneChangePayload(body);
  if (!phoneChange) {
    return null;
  }

  if (!phoneChange.personKey && !phoneChange.externalPersonId) {
    const error = new Error(
      'Phone change received but no Vibes person_key or external_person_id identity was found'
    );
    error.status = 422;
    throw error;
  }

  const downstreamResult = await vibesClient.updatePersonPhone(phoneChange);

  return buildDispatchResponse([
    buildDownstreamEntry('Vibes', downstreamResult.status)
  ]);
}

module.exports = {
  processPhoneCorrection
};
