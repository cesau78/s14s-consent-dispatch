/**
 * Ketch Web API — write SMS marketing opt-out when user texts Vibes (MO keyword).
 * POST /consent/{organizationCode}/update
 */
const config = require('../config');
const { buildVibesSmsOptOutContext } = require('./consentOrigin');

/** buildIdentities — map personKey / phone to first configured Ketch identity spaces. */
function buildIdentities({ personKey, phone }) {
  const identities = {};

  if (personKey) {
    for (const space of config.ketchVibesPersonKeyIdentitySpaces) {
      identities[space] = personKey;
      break;
    }
  }

  if (phone) {
    for (const space of config.ketchPhoneIdentitySpaces) {
      identities[space] = phone;
      break;
    }
  }

  return identities;
}

/** buildSetConsentBody — deny SMS marketing purposes + vibes_sms_optout origin context. */
function buildSetConsentBody({ personKey, phone, collectedAt }) {
  const purposes = {};
  for (const purposeCode of config.ketchSmsMarketingPurposeCodes) {
    purposes[purposeCode] = {
      allowed: 'false',
      legalBasisCode: 'consent_optout'
    };
  }

  return {
    organizationCode: config.ketchOrganizationCode,
    propertyCode: config.ketchPropertyCode,
    environmentCode: config.ketchEnvironmentCode,
    jurisdictionCode: config.ketchJurisdictionCode,
    identities: buildIdentities({ personKey, phone }),
    purposes,
    collectedAt: collectedAt || Math.floor(Date.now() / 1000),
    context: buildVibesSmsOptOutContext()
  };
}

/**
 * recordSmsMarketingOptOut — Vibes MO path → Ketch consent update.
 *
 * Sequence:
 *   1. Validate org / property / jurisdiction + personKey or phone
 *   2. buildSetConsentBody (includes loop-guard context)
 *   3. POST Ketch consent API
 *   4. Non-OK response → throw with error.status
 */
async function recordSmsMarketingOptOut({ personKey, phone, collectedAt }) {
  if (!config.ketchOrganizationCode) {
    throw new Error('KETCH_ORGANIZATION_CODE is required');
  }
  if (!config.ketchPropertyCode) {
    throw new Error('KETCH_PROPERTY_CODE is required');
  }
  if (!config.ketchJurisdictionCode) {
    throw new Error('KETCH_JURISDICTION_CODE is required');
  }
  if (!personKey && !phone) {
    throw new Error('personKey or phone is required to update Ketch consent');
  }

  const base = config.ketchApiBaseUrl.replace(/\/$/, '');
  const url = `${base}/consent/${encodeURIComponent(config.ketchOrganizationCode)}/update`;
  const body = buildSetConsentBody({ personKey, phone, collectedAt });

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  if (config.ketchApiKey) {
    headers.Authorization = `Bearer ${config.ketchApiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let responseBody = null;
  if (text) {
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
  }

  if (!response.ok) {
    const error = new Error(`Ketch API ${response.status}`);
    error.status = response.status;
    error.body = responseBody;
    throw error;
  }

  return {
    status: response.status,
    body: responseBody
  };
}

module.exports = {
  buildSetConsentBody,
  recordSmsMarketingOptOut
};
