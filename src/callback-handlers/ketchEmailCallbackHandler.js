/**
 * Ketch Forwarder: email corrections → MessageGears recipient profile update.
 */
const {
  buildDownstreamEntry,
  buildDispatchResponse
} = require('../services/callbackResponse');
const { parseEmailChangePayload } = require('../services/ketchPayloadParser');
const messageGearsClient = require('../services/messageGearsClient');

/**
 * processEmailCorrection — run when dispatcher did not handle a phone correction first.
 *
 * Sequence:
 *   1. parseEmailChangePayload — no email in payload → return null
 *   2. Require MessageGears recipient_id or external_recipient_id → else 422
 *   3. messageGearsClient.updateRecipientEmail (PUT or POST)
 *   4. Return 200 + downstream[{ system: MessageGears, update: status }]
 */
async function processEmailCorrection(body) {
  // 1. identities → context → subject (first normalized email wins)
  const emailChange = parseEmailChangePayload(body);
  if (!emailChange) {
    return null;
  }

  // 2. Downstream API needs at least one recipient identifier
  if (!emailChange.recipientId && !emailChange.externalRecipientId) {
    const error = new Error(
      'Email change received but no MessageGears recipient_id or external_recipient_id identity was found'
    );
    error.status = 422;
    throw error;
  }

  // 3–4. Sync to MessageGears and record outcome for Ketch Forwarder
  const downstreamResult = await messageGearsClient.updateRecipientEmail(emailChange);

  return buildDispatchResponse([
    buildDownstreamEntry('MessageGears', downstreamResult.status)
  ]);
}

module.exports = {
  processEmailCorrection
};
