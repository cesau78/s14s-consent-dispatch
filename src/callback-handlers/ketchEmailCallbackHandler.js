/**
 * Ketch Forwarder callback-handler: email corrections → MessageGears recipient profiles.
 */
const {
  buildDownstreamEntry,
  buildDispatchResponse
} = require('../services/callbackResponse');
const { parseEmailChangePayload } = require('../services/ketchPayloadParser');
const messageGearsClient = require('../services/messageGearsClient');

async function processEmailCorrection(body) {
  const emailChange = parseEmailChangePayload(body);
  if (!emailChange) {
    return null;
  }

  if (!emailChange.recipientId && !emailChange.externalRecipientId) {
    const error = new Error(
      'Email change received but no MessageGears recipient_id or external_recipient_id identity was found'
    );
    error.status = 422;
    throw error;
  }

  const downstreamResult = await messageGearsClient.updateRecipientEmail(emailChange);

  return buildDispatchResponse([
    buildDownstreamEntry('MessageGears', downstreamResult.status)
  ]);
}

module.exports = {
  processEmailCorrection
};
