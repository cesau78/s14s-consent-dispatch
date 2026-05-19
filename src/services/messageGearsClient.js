/**
 * MessageGears recipient API — email corrections and marketing opt-out profile updates.
 */
const config = require('../config');

function getAuthHeader() {
  return `Bearer ${config.messageGearsApiKey}`;
}

function buildRecipientUrl(recipientId) {
  const base = config.messageGearsApiBaseUrl.replace(/\/$/, '');
  return `${base}/api/v1/accounts/${encodeURIComponent(config.messageGearsAccountId)}/recipients/${encodeURIComponent(recipientId)}`;
}

function buildRecipientCollectionUrl() {
  const base = config.messageGearsApiBaseUrl.replace(/\/$/, '');
  return `${base}/api/v1/accounts/${encodeURIComponent(config.messageGearsAccountId)}/recipients/`;
}

/** messageGearsRequest — fetch with Bearer auth; throws on non-OK with .status and .body. */
async function messageGearsRequest(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
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
    const error = new Error(`MessageGears API ${response.status}`);
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
 * updateRecipientEmail — Ketch email correction → MessageGears.
 *
 * Sequence: validate config → recipientId PUT else externalRecipientId POST else throw
 */
async function updateRecipientEmail({ recipientId, externalRecipientId, email }) {
  if (!config.messageGearsAccountId) {
    throw new Error('MESSAGEGEARS_ACCOUNT_ID is required');
  }
  if (!config.messageGearsApiKey) {
    throw new Error('MESSAGEGEARS_API_KEY is required');
  }

  const payload = {
    emailAddress: email
  };

  if (externalRecipientId) {
    payload.externalRecipientId = externalRecipientId;
  }

  if (recipientId) {
    return messageGearsRequest(buildRecipientUrl(recipientId), {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  if (!externalRecipientId) {
    throw new Error('recipientId or externalRecipientId is required to update MessageGears');
  }

  return messageGearsRequest(buildRecipientCollectionUrl(), {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * optOutRecipient — Ketch email marketing denied → MessageGears (MESSAGEGEARS_OPT_OUT_PAYLOAD_JSON).
 *
 * Same PUT/POST branch as updateRecipientEmail; payload from config (default emailOptIn: false).
 */
async function optOutRecipient({ recipientId, externalRecipientId }) {
  if (!config.messageGearsAccountId) {
    throw new Error('MESSAGEGEARS_ACCOUNT_ID is required');
  }
  if (!config.messageGearsApiKey) {
    throw new Error('MESSAGEGEARS_API_KEY is required');
  }

  const payload = {
    ...config.messageGearsOptOutPayload
  };

  if (externalRecipientId) {
    payload.externalRecipientId = externalRecipientId;
  }

  if (recipientId) {
    return messageGearsRequest(buildRecipientUrl(recipientId), {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  if (!externalRecipientId) {
    throw new Error('recipientId or externalRecipientId is required to opt out in MessageGears');
  }

  return messageGearsRequest(buildRecipientCollectionUrl(), {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

module.exports = {
  updateRecipientEmail,
  optOutRecipient,
  buildRecipientUrl,
  buildRecipientCollectionUrl,
  getAuthHeader
};
