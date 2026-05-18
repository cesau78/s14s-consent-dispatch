/**
 * MessageGears recipient profile API client for email address corrections.
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
 * Sync an email change to MessageGears.
 * - With recipientId: update an existing recipient (PUT).
 * - With only externalRecipientId: create or merge via collection POST.
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

module.exports = {
  updateRecipientEmail,
  buildRecipientUrl,
  buildRecipientCollectionUrl,
  getAuthHeader
};
