/**
 * Ketch Forwarder ConsentRequest → Vibes SMS unsubscribe and/or MessageGears email opt-out.
 *
 * Loop guards (skipVibes / skipMessageGears) come from consentOrigin markers in
 * request.context so we do not echo the same change back to the system that started it.
 */
const {
  buildDownstreamEntry,
  buildDispatchResponse
} = require('../services/callbackResponse');
const { parseConsentDispatchPayload } = require('../services/ketchConsentPayloadParser');
const vibesClient = require('../services/vibesClient');
const messageGearsClient = require('../services/messageGearsClient');

/**
 * processConsentRequest — marketing opt-out propagation (SMS and email channels).
 *
 * Sequence (sequential, not parallel):
 *   1. parseConsentDispatchPayload — nothing to do → empty downstream
 *   2. If SMS denied + person_key + !skipVibes → Vibes DELETE subscription
 *   3. If email denied + recipient id + !skipMessageGears → MessageGears opt-out PUT/POST
 *   4. Return 200 + downstream[] (0, 1, or 2 entries)
 */
async function processConsentRequest(body) {
  // 1. Check purposes + identities + origin context
  const consentChange = parseConsentDispatchPayload(body);
  if (!consentChange) {
    return buildDispatchResponse();
  }

  const downstream = [];

  // 2. SMS channel (Vibes subscription list)
  if (consentChange.sms && !consentChange.sms.skipVibes) {
    const vibesResult = await vibesClient.unsubscribePersonFromList(consentChange.sms.personKey);
    downstream.push(buildDownstreamEntry('Vibes', vibesResult.status));
  }

  // 3. Email channel (MessageGears profile flags)
  if (consentChange.email && !consentChange.email.skipMessageGears) {
    const messageGearsResult = await messageGearsClient.optOutRecipient({
      recipientId: consentChange.email.recipientId,
      externalRecipientId: consentChange.email.externalRecipientId
    });
    downstream.push(buildDownstreamEntry('MessageGears', messageGearsResult.status));
  }

  // 4.
  return buildDispatchResponse(downstream);
}

module.exports = {
  processConsentRequest
};
