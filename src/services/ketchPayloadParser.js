const config = require('../config');
const { normalizePhoneToE164 } = require('./phoneNormalizer');

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

function getForwarderRequest(body) {
  if (body && typeof body.request === 'object') {
    return body.request;
  }
  if (body && typeof body.event === 'object') {
    return body.event;
  }
  return null;
}

function parsePhoneChangePayload(body) {
  const request = getForwarderRequest(body);
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

module.exports = {
  parsePhoneChangePayload,
  extractPhoneFromIdentities,
  extractPhoneFromContext,
  extractPhoneFromSubject,
  extractPersonKey,
  extractExternalPersonId,
  getForwarderRequest,
  readContextValue
};
