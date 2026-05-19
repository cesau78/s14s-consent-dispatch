/**
 * Vibes Mobile Database API — person phone updates and SMS subscription unsubscribe.
 */
const config = require('../config');

/** getAuthHeader — Basic auth from VIBES_API_USERNAME / VIBES_API_PASSWORD. */
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

function buildSubscriptionUrl(personKey, subscriptionListId) {
  const base = config.vibesApiBaseUrl.replace(/\/$/, '');
  return (
    `${base}/companies/${encodeURIComponent(config.vibesCompanyKey)}/mobiledb/persons/` +
    `${encodeURIComponent(personKey)}/subscriptions/${encodeURIComponent(subscriptionListId)}`
  );
}

/**
 * vibesRequest — fetch with Vibes auth headers; throws on non-OK with .status and .body.
 */
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
 * updatePersonPhone — Ketch phone correction → Vibes.
 *
 * Sequence:
 *   1. Validate company key + credentials
 *   2. personKey → PUT person; else externalPersonId → POST collection; else throw
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

/**
 * unsubscribePersonFromList — Ketch SMS opt-out → DELETE subscription (VIBES_SMS_SUBSCRIPTION_LIST_ID).
 *
 * Sequence:
 *   1. Validate config + personKey + list id
 *   2. DELETE subscription URL
 *   3. 404 → treat as success (already unsubscribed)
 */
async function unsubscribePersonFromList(personKey, subscriptionListId = config.vibesSmsSubscriptionListId) {
  if (!config.vibesCompanyKey) {
    throw new Error('VIBES_COMPANY_KEY is required');
  }
  if (!config.vibesApiUsername || !config.vibesApiPassword) {
    throw new Error('VIBES_API_USERNAME and VIBES_API_PASSWORD are required');
  }
  if (!personKey) {
    throw new Error('personKey is required to unsubscribe from Vibes');
  }
  if (!subscriptionListId) {
    throw new Error('VIBES_SMS_SUBSCRIPTION_LIST_ID is required');
  }

  try {
    return await vibesRequest(buildSubscriptionUrl(personKey, subscriptionListId), {
      method: 'DELETE'
    });
  } catch (error) {
    if (error.status === 404) {
      return { status: 204, body: null };
    }
    throw error;
  }
}

module.exports = {
  updatePersonPhone,
  unsubscribePersonFromList,
  buildPersonUrl,
  buildPersonCollectionUrl,
  buildSubscriptionUrl,
  getAuthHeader
};
