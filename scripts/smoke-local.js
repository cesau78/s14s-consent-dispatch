/**
 * POST each examples/ketch payload to a running dispatch service and print results.
 *
 * Usage:
 *   npm start
 *   npm run smoke:local
 *   npm run smoke:local:docker
 */
const fs = require('fs');
const path = require('path');
const { LOCAL_DEV_CALLBACK_AUTH_VALUE } = require('../src/config');

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const auth = process.env.SMOKE_AUTH || LOCAL_DEV_CALLBACK_AUTH_VALUE;

const cases = [
  {
    file: 'correction-request-phone.json',
    downstream: 'Vibes',
    note: 'CorrectionRequest — phone in identities; PUT to Vibes'
  },
  {
    file: 'correction-request-context-phone.json',
    downstream: 'Vibes',
    note: 'CorrectionRequest — phone in context; PUT to Vibes'
  },
  {
    file: 'correction-request-formdata-phone.json',
    downstream: 'Vibes',
    note: 'CorrectionRequest — phone in subject.formData; POST to Vibes'
  },
  {
    file: 'correction-status-event-phone.json',
    downstream: 'Vibes',
    note: 'CorrectionStatusEvent — phone in event envelope; PUT to Vibes'
  },
  {
    file: 'correction-request-no-phone.json',
    downstream: null,
    note: 'CorrectionRequest — no phone or email; empty downstream'
  },
  {
    file: 'consent-request.json',
    downstream: null,
    note: 'ConsentRequest — no downstream updates'
  },
  {
    file: 'correction-request-email.json',
    downstream: 'MessageGears',
    note: 'CorrectionRequest — email in identities; PUT to MessageGears'
  },
  {
    file: 'correction-request-context-email.json',
    downstream: 'MessageGears',
    note: 'CorrectionRequest — email in context; PUT to MessageGears'
  },
  {
    file: 'correction-request-formdata-email.json',
    downstream: 'MessageGears',
    note: 'CorrectionRequest — email in subject.formData; POST to MessageGears'
  },
  {
    file: 'correction-status-event-email.json',
    downstream: 'MessageGears',
    note: 'CorrectionStatusEvent — email in event envelope; PUT to MessageGears'
  }
];

async function assertWireMockStubs() {
  const wiremockUrl = (process.env.SMOKE_WIREMOCK_URL || 'http://localhost:8080').replace(
    /\/$/,
    ''
  );
  try {
    const response = await fetch(`${wiremockUrl}/__admin/mappings`);
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const count = data.meta && data.meta.total;
    if (typeof count === 'number' && count < 4) {
      console.warn(
        `WireMock at ${wiremockUrl} has ${count} stub(s); expected 4 (Vibes + MessageGears). ` +
          'Recreate WireMock after adding mappings:\n' +
          '  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --force-recreate wiremock\n'
      );
    }
  } catch {
    // WireMock not running (e.g. host-only Node); skip.
  }
}

function validateDownstream(body, expectedSystem) {
  if (!body || !Array.isArray(body.downstream)) {
    return false;
  }

  if (!expectedSystem) {
    return body.downstream.length === 0;
  }

  return body.downstream.some(
    (entry) =>
      entry.system === expectedSystem &&
      entry.update === 200 &&
      typeof entry.updated === 'string' &&
      /^\d{8}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(entry.updated)
  );
}

async function postExample(testCase) {
  const filePath = path.join(__dirname, '..', 'examples', 'ketch', testCase.file);
  const body = fs.readFileSync(filePath, 'utf8');
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    headers.Authorization = auth;
  }

  const response = await fetch(`${baseUrl}/ketch/webhook`, {
    method: 'POST',
    headers,
    body
  });

  const responseText = await response.text();
  let responseBody = null;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  const statusOk = response.status === 200;
  const bodyOk = validateDownstream(responseBody, testCase.downstream);
  const ok = statusOk && bodyOk;
  const prefix = ok ? 'OK' : 'FAIL';

  console.log(`${prefix}  ${testCase.file}  →  ${response.status} (expected 200)`);
  console.log(`      ${testCase.note}`);
  if (!ok) {
    console.log(`      body: ${JSON.stringify(responseBody).slice(0, 240)}`);
    if (responseBody && responseBody.kind === 'CorrectionResponse') {
      console.log(
        '      hint: dispatch is running old code — rebuild: npm run dev:compose (or restart npm start)'
      );
    }
    process.exitCode = 1;
  }
}

async function main() {
  console.log(`Smoke testing ${baseUrl}/ketch/webhook\n`);
  await assertWireMockStubs();
  for (const testCase of cases) {
    await postExample(testCase);
  }
  if (process.exitCode) {
    console.log('\nOne or more examples failed.');
  } else {
    console.log('\nAll examples passed.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
