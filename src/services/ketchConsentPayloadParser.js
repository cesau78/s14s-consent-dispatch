/**
 * Parse Ketch ConsentRequest for downstream SMS (Vibes) and email (MessageGears) opt-out.
 */
const config = require('../config');
const { getEnvelopeSection } = require('./ketchCorrectionUtils');
const {
  isVibesSmsOptOutOrigin,
  isMessageGearsEmailOptOutOrigin
} = require('./consentOrigin');

/** matchesSpace — identitySpace in allowed list (case-insensitive). */
function matchesSpace(identitySpace, allowedSpaces) {
  const normalizedSpace = String(identitySpace ?? '').toLowerCase();
  return allowedSpaces.some((space) => space.toLowerCase() === normalizedSpace);
}

/** extractPersonKey — Vibes person_key from identities. */
function extractPersonKey(identities) {
  if (!Array.isArray(identities)) {
    return null;
  }

  for (const identity of identities) {
    if (!matchesSpace(identity.identitySpace, config.ketchVibesPersonKeyIdentitySpaces)) {
      continue;
    }
    if (identity.identityValue) {
      return String(identity.identityValue);
    }
  }

  return null;
}

/** extractRecipientId — MessageGears recipient_id from identities. */
function extractRecipientId(identities) {
  if (!Array.isArray(identities)) {
    return null;
  }

  for (const identity of identities) {
    if (!matchesSpace(identity.identitySpace, config.ketchMessageGearsRecipientIdIdentitySpaces)) {
      continue;
    }
    if (identity.identityValue) {
      return String(identity.identityValue);
    }
  }

  return null;
}

/** extractExternalRecipientId — MessageGears external id from identities. */
function extractExternalRecipientId(identities) {
  if (!Array.isArray(identities)) {
    return null;
  }

  for (const identity of identities) {
    if (
      !matchesSpace(identity.identitySpace, config.ketchMessageGearsExternalRecipientIdIdentitySpaces)
    ) {
      continue;
    }
    if (identity.identityValue) {
      return String(identity.identityValue);
    }
  }

  return null;
}

/**
 * isPurposeDenied — true if any purposeCodes entry is status "denied".
 */
function isPurposeDenied(purposes, purposeCodes) {
  if (!purposes || typeof purposes !== 'object') {
    return false;
  }

  for (const purposeCode of purposeCodes) {
    const status = purposes[purposeCode];
    if (status && String(status).toLowerCase() === 'denied') {
      return true;
    }

    const match = Object.keys(purposes).find(
      (entry) => entry.toLowerCase() === purposeCode.toLowerCase()
    );
    if (match && String(purposes[match]).toLowerCase() === 'denied') {
      return true;
    }
  }

  return false;
}

/** isSmsMarketingDenied — KETCH_SMS_MARKETING_PURPOSE_CODES. */
function isSmsMarketingDenied(purposes) {
  return isPurposeDenied(purposes, config.ketchSmsMarketingPurposeCodes);
}

/** isEmailMarketingDenied — KETCH_EMAIL_MARKETING_PURPOSE_CODES. */
function isEmailMarketingDenied(purposes) {
  return isPurposeDenied(purposes, config.ketchEmailMarketingPurposeCodes);
}

/**
 * parseConsentDispatchPayload — what to send to Vibes / MessageGears after Ketch consent change.
 *
 * Sequence:
 *   1. getEnvelopeSection (request or event) — missing → null
 *   2. Neither SMS nor email marketing denied → null
 *   3. SMS denied + person_key → sms slot (skipVibes if vibes_sms_optout origin)
 *   4. Email denied + recipient id → email slot (skipMessageGears if messagegears origin)
 *   5. Neither slot populated → null
 */
function parseConsentDispatchPayload(body) {
  // 1.
  const section = getEnvelopeSection(body);
  if (!section) {
    return null;
  }

  const identities = section.identities;
  const purposes = section.purposes;
  const context = section.context;
  const smsDenied = isSmsMarketingDenied(purposes);
  const emailDenied = isEmailMarketingDenied(purposes);

  // 2.
  if (!smsDenied && !emailDenied) {
    return null;
  }

  const result = {
    sms: null,
    email: null
  };

  // 3.
  if (smsDenied) {
    const personKey = extractPersonKey(identities);
    if (personKey) {
      result.sms = {
        personKey,
        skipVibes: isVibesSmsOptOutOrigin(context)
      };
    }
  }

  // 4.
  if (emailDenied) {
    const recipientId = extractRecipientId(identities);
    const externalRecipientId = extractExternalRecipientId(identities);
    if (recipientId || externalRecipientId) {
      result.email = {
        recipientId,
        externalRecipientId,
        skipMessageGears: isMessageGearsEmailOptOutOrigin(context)
      };
    }
  }

  // 5.
  if (!result.sms && !result.email) {
    return null;
  }

  return result;
}

module.exports = {
  parseConsentDispatchPayload,
  isSmsMarketingDenied,
  isEmailMarketingDenied,
  isPurposeDenied
};
