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

function matchesSpace(identitySpace, allowedSpaces) {
  return allowedSpaces.some(
    (space) => space.toLowerCase() === String(identitySpace || '').toLowerCase()
  );
}

function matchesPhoneKey(key) {
  return (
    matchesSpace(key, config.ketchPhoneContextKeys) ||
    matchesSpace(key, config.ketchPhoneIdentitySpaces)
  );
}

function matchesEmailKey(key) {
  return (
    matchesSpace(key, config.ketchEmailContextKeys) ||
    matchesSpace(key, config.ketchEmailIdentitySpaces)
  );
}

/** Case-insensitive lookup for context / formData keys. */
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
