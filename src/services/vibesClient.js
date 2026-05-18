/**
 * Vibes Mobile Database API client for updating subscriber phone numbers (MDN).
 */
const config = require('../config');

function getAuthHeader() {
  const token = Buffer.from(
    `${config.vibesApiUsername}:${config.vibesApiPassword}`,
    'utf8'
  ).toString('base64');
  return `Basic ${token}`;
}

function buildPersonUrl(personKey) {
  const base = config.vibesApiBaseUrl.replace(/\/$/, '');
  return `${base}/companies/${encodeURIComponent(config.vibesCompanyKey)}/mobiledb/persons/${encodeURIComponent(personKey)}`;
}

function buildPersonCollectionUrl() {
  const base = config.vibesApiBaseUrl.replace(/\/$/, '');
  return `${base}/companies/${encodeURIComponent(config.vibesCompanyKey)}/mobiledb/persons/`;
}

async function vibesRequest(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Version': config.vibesApiVersion,
      Authorization: getAuthHeader(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const error = new Error(`Vibes API ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return {
    status: response.status,
    body
  };
}

/**
 * Sync a phone change to Vibes.
 * - With personKey: update an existing person (PUT).
 * - With only externalPersonId: create or merge via collection POST.
 */
async function updatePersonPhone({ personKey, externalPersonId, phone }) {
  if (!config.vibesCompanyKey) {
    throw new Error('VIBES_COMPANY_KEY is required');
  }
  if (!config.vibesApiUsername || !config.vibesApiPassword) {
    throw new Error('VIBES_API_USERNAME and VIBES_API_PASSWORD are required');
  }

  const payload = {
    mobile_phone: {
      mdn: phone
    }
  };

  if (externalPersonId) {
    payload.external_person_id = externalPersonId;
  }

  if (personKey) {
    return vibesRequest(buildPersonUrl(personKey), {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  if (!externalPersonId) {
    throw new Error('personKey or externalPersonId is required to update Vibes');
  }

  return vibesRequest(buildPersonCollectionUrl(), {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

module.exports = {
  updatePersonPhone,
  buildPersonUrl,
  buildPersonCollectionUrl,
  getAuthHeader
};
