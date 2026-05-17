const { parsePhoneChangePayload } = require('../services/ketchPayloadParser');
const vibesClient = require('../services/vibesClient');

const PHONE_CHANGE_KINDS = new Set([
  'CorrectionRequest',
  'CorrectionStatusEvent'
]);

function getEnvelopeSection(body) {
  if (body && typeof body.request === 'object') {
    return body.request;
  }
  if (body && typeof body.event === 'object') {
    return body.event;
  }
  return null;
}

function buildCorrectionResponse(metadata) {
  return {
    apiVersion: 'dsr/v1',
    kind: 'CorrectionResponse',
    metadata: metadata || {},
    response: {
      status: 'completed',
      resultMessage: 'Phone number synchronized to Vibes'
    }
  };
}

async function handleKetchPhoneCallback(body) {
  const kind = body && body.kind;
  if (!kind) {
    const error = new Error('Missing Ketch message kind');
    error.status = 400;
    throw error;
  }

  if (!PHONE_CHANGE_KINDS.has(kind)) {
    return { status: 204, body: null };
  }

  const phoneChange = parsePhoneChangePayload(body);
  if (!phoneChange) {
    return { status: 204, body: null };
  }

  if (!phoneChange.personKey && !phoneChange.externalPersonId) {
    const error = new Error(
      'Phone change received but no Vibes person_key or external_person_id identity was found'
    );
    error.status = 422;
    throw error;
  }

  await vibesClient.updatePersonPhone(phoneChange);

  if (kind === 'CorrectionRequest') {
    return {
      status: 200,
      body: buildCorrectionResponse(body.metadata)
    };
  }

  return { status: 204, body: null };
}

module.exports = {
  handleKetchPhoneCallback,
  buildCorrectionResponse,
  getEnvelopeSection,
  PHONE_CHANGE_KINDS
};
