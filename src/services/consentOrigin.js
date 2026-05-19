/**
 * Ketch request.context markers — prevent consent echo loops between Ketch and downstream systems.
 *
 * Vibes MO opt-out sets consent_dispatch_origin=vibes_sms_optout so the echoed ConsentRequest
 * does not call Vibes unsubscribe again. MessageGears uses messagegears_email_optout similarly.
 */
const config = require('../config');

/**
 * isConsentOrigin — compare context.consent_dispatch_origin to expectedOrigin (case-insensitive).
 */
function isConsentOrigin(context, expectedOrigin) {
  if (!context || typeof context !== 'object') {
    return false;
  }

  const key = config.ketchConsentOriginContextKey;
  const expected = String(expectedOrigin || '').toLowerCase();

  if (Object.prototype.hasOwnProperty.call(context, key)) {
    return String(context[key]).toLowerCase() === expected;
  }

  const match = Object.keys(context).find(
    (entry) => entry.toLowerCase() === key.toLowerCase()
  );
  if (!match) {
    return false;
  }

  return String(context[match]).toLowerCase() === expected;
}

/** isVibesSmsOptOutOrigin — skip Vibes unsubscribe on echoed ConsentRequest. */
function isVibesSmsOptOutOrigin(context) {
  return isConsentOrigin(context, config.ketchConsentOriginVibesSms);
}

/** isMessageGearsEmailOptOutOrigin — skip MessageGears opt-out on echoed ConsentRequest. */
function isMessageGearsEmailOptOutOrigin(context) {
  return isConsentOrigin(context, config.ketchConsentOriginMessageGearsEmail);
}

/** buildVibesSmsOptOutContext — attached to Ketch consent POST from Vibes MO handler. */
function buildVibesSmsOptOutContext() {
  return {
    [config.ketchConsentOriginContextKey]: config.ketchConsentOriginVibesSms
  };
}

module.exports = {
  isConsentOrigin,
  isVibesSmsOptOutOrigin,
  isMessageGearsEmailOptOutOrigin,
  buildVibesSmsOptOutContext
};
