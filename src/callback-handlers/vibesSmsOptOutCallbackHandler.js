/**
 * Vibes inbound MO SMS (e.g. user texts "no") → Ketch consent update.
 *
 * Non-opt-out traffic is acknowledged with empty downstream (no error).
 */
const {
  buildDownstreamEntry,
  buildDispatchResponse
} = require('../services/callbackResponse');
const { parseSmsOptOutPayload } = require('../services/vibesInboundParser');
const ketchConsentClient = require('../services/ketchConsentClient');

/**
 * processVibesSmsOptOut — Vibes webhook business logic.
 *
 * Sequence:
 *   1. parseSmsOptOutPayload — not MO / not keyword / no ids → empty downstream (200)
 *   2. ketchConsentClient.recordSmsMarketingOptOut (sets vibes_sms_optout origin)
 *   3. Return 200 + downstream[{ system: Ketch, update: status }]
 */
async function processVibesSmsOptOut(body) {
  // 1. Filter to configured opt-out keywords only
  const optOut = parseSmsOptOutPayload(body);
  if (!optOut) {
    return buildDispatchResponse();
  }

  // 2. Deny SMS marketing purposes in Ketch (Forwarder will echo ConsentRequest later)
  const downstreamResult = await ketchConsentClient.recordSmsMarketingOptOut({
    personKey: optOut.personKey,
    phone: optOut.phone
  });

  // 3.
  return buildDispatchResponse([
    buildDownstreamEntry('Ketch', downstreamResult.status)
  ]);
}

module.exports = {
  processVibesSmsOptOut
};
