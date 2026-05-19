/**
 * Extract phone numbers, email addresses, and downstream identifiers from Ketch Forwarder payloads.
 *
 * Ketch may place values in identities, context variables, or subject form fields
 * depending on tenant configuration. Identity space names are configurable via env.
 */
const config = require('../config');
const { normalizePhoneToE164 } = require('./phoneNormalizer');
const { normalizeEmail } = require('./emailNormalizer');
const { getEnvelopeSection } = require('./ketchCorrectionUtils');

/** matchesSpace — identitySpace in allowed list (case-insensitive). */
function matchesSpace(identitySpace, allowedSpaces) {
  return allowedSpaces.some(
    (space) => space.toLowerCase() === String(identitySpace || '').toLowerCase()
  );
}

/** matchesPhoneKey — context key matches phone identity or context env keys. */
function matchesPhoneKey(key) {
  return (
    matchesSpace(key, config.ketchPhoneContextKeys) ||
    matchesSpace(key, config.ketchPhoneIdentitySpaces)
  );
}

/** matchesEmailKey — context key matches email identity or context env keys. */
function matchesEmailKey(key) {
  return (
    matchesSpace(key, config.ketchEmailContextKeys) ||
    matchesSpace(key, config.ketchEmailIdentitySpaces)
  );
}

/** readContextValue — case-insensitive lookup in context / formData. */
function readContextValue(context, key) {
  if (!context || typeof context !== 'object') {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(context, key)) {
    return context[key];
  }

  const match = Object.keys(context).find(
    (entry) => entry.toLowerCase() === key.toLowerCase()
  );
  return match ? context[match] : null;
}

/** extractPhoneFromIdentities — first valid E.164 from phone identity spaces. */
function extractPhoneFromIdentities(identities) {
  if (!Array.isArray(identities)) {
    return null;
  }

  for (const identity of identities) {
    if (!matchesSpace(identity.identitySpace, config.ketchPhoneIdentitySpaces)) {
      continue;
    }
    const normalized = normalizePhoneToE164(identity.identityValue);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/** extractPersonKey — Vibes person_key identity space. */
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

/** extractExternalPersonId — Vibes external_person_id identity space. */
function extractExternalPersonId(identities) {
  if (!Array.isArray(identities)) {
    return null;
  }

  for (const identity of identities) {
    if (!matchesSpace(identity.identitySpace, config.ketchExternalPersonIdIdentitySpaces)) {
      continue;
    }
    if (identity.identityValue) {
      return String(identity.identityValue);
    }
  }

  return null;
}

/** extractPhoneFromContext — configured keys, then scan keys matching phone spaces. */
function extractPhoneFromContext(context) {
  if (!context || typeof context !== 'object') {
    return null;
  }

  for (const key of config.ketchPhoneContextKeys) {
    const value = readContextValue(context, key);
    const normalized = normalizePhoneToE164(
      typeof value === 'string' ? value : value == null ? null : String(value)
    );
    if (normalized) {
      return normalized;
    }
  }

  // Also scan raw context keys (e.g. mobile) that match phone identity spaces.
  for (const [key, value] of Object.entries(context)) {
    if (!matchesPhoneKey(key)) {
      continue;
    }
    const normalized = normalizePhoneToE164(
      typeof value === 'string' ? value : value == null ? null : String(value)
    );
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/** extractPhoneFromSubject — subject.phone fields, else subject.formData. */
function extractPhoneFromSubject(subject) {
  if (!subject || typeof subject !== 'object') {
    return null;
  }

  const directCandidates = [
    subject.phone,
    subject.mobilePhone,
    subject.mobile_phone
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizePhoneToE164(
      typeof candidate === 'string' ? candidate : candidate == null ? null : String(candidate)
    );
    if (normalized) {
      return normalized;
    }
  }

  if (subject.formData && typeof subject.formData === 'object') {
    return extractPhoneFromContext(subject.formData);
  }

  return null;
}

/** extractRecipientId — MessageGears recipient_id identity space. */
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

/** extractExternalRecipientId — MessageGears external recipient identity space. */
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

/** extractEmailFromIdentities — first normalized email from email identity spaces. */
function extractEmailFromIdentities(identities) {
  if (!Array.isArray(identities)) {
    return null;
  }

  for (const identity of identities) {
    if (!matchesSpace(identity.identitySpace, config.ketchEmailIdentitySpaces)) {
      continue;
    }
    const normalized = normalizeEmail(identity.identityValue);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/** extractEmailFromContext — configured keys, then scan keys matching email spaces. */
function extractEmailFromContext(context) {
  if (!context || typeof context !== 'object') {
    return null;
  }

  for (const key of config.ketchEmailContextKeys) {
    const value = readContextValue(context, key);
    const normalized = normalizeEmail(
      typeof value === 'string' ? value : value == null ? null : String(value)
    );
    if (normalized) {
      return normalized;
    }
  }

  for (const [key, value] of Object.entries(context)) {
    if (!matchesEmailKey(key)) {
      continue;
    }
    const normalized = normalizeEmail(
      typeof value === 'string' ? value : value == null ? null : String(value)
    );
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/** extractEmailFromSubject — subject.email fields, else subject.formData. */
function extractEmailFromSubject(subject) {
  if (!subject || typeof subject !== 'object') {
    return null;
  }

  const directCandidates = [subject.email, subject.emailAddress, subject.email_address];

  for (const candidate of directCandidates) {
    const normalized = normalizeEmail(
      typeof candidate === 'string' ? candidate : candidate == null ? null : String(candidate)
    );
    if (normalized) {
      return normalized;
    }
  }

  if (subject.formData && typeof subject.formData === 'object') {
    return extractEmailFromContext(subject.formData);
  }

  return null;
}

/**
 * parsePhoneChangePayload — Ketch correction → Vibes person update input.
 *
 * Sequence:
 *   1. getEnvelopeSection — no request/event → null
 *   2. Phone: identities → context → subject (first E.164 wins)
 *   3. No phone → null
 *   4. Attach personKey + externalPersonId from identities
 */
function parsePhoneChangePayload(body) {
  const request = getEnvelopeSection(body);
  if (!request) {
    return null;
  }

  const phone =
    extractPhoneFromIdentities(request.identities) ||
    extractPhoneFromContext(request.context) ||
    extractPhoneFromSubject(request.subject);

  if (!phone) {
    return null;
  }

  return {
    phone,
    personKey: extractPersonKey(request.identities),
    externalPersonId: extractExternalPersonId(request.identities)
  };
}

/**
 * parseEmailChangePayload — Ketch correction → MessageGears recipient update input.
 *
 * Sequence:
 *   1. getEnvelopeSection — no request/event → null
 *   2. Email: identities → context → subject (first valid email wins)
 *   3. No email → null
 *   4. Attach recipientId + externalRecipientId from identities
 */
function parseEmailChangePayload(body) {
  const request = getEnvelopeSection(body);
  if (!request) {
    return null;
  }

  const email =
    extractEmailFromIdentities(request.identities) ||
    extractEmailFromContext(request.context) ||
    extractEmailFromSubject(request.subject);

  if (!email) {
    return null;
  }

  return {
    email,
    recipientId: extractRecipientId(request.identities),
    externalRecipientId: extractExternalRecipientId(request.identities)
  };
}

module.exports = {
  parsePhoneChangePayload,
  parseEmailChangePayload,
  extractPhoneFromIdentities,
  extractPhoneFromContext,
  extractPhoneFromSubject,
  extractEmailFromIdentities,
  extractEmailFromContext,
  extractEmailFromSubject,
  extractPersonKey,
  extractExternalPersonId,
  extractRecipientId,
  extractExternalRecipientId,
  getEnvelopeSection,
  readContextValue
};
