/**
 * POST each examples/ketch payload to a running dispatch service and print results.
 *
 * Usage:
 *   npm start
 *   npm run smoke:local
 *
 *   npm run smoke:local
 *   npm run smoke:local:docker   (alias; same Bearer local-dev header)
 */
const fs = require('fs');
const path = require('path');
const { LOCAL_DEV_CALLBACK_AUTH_VALUE } = require('../src/config');

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const auth = process.env.SMOKE_AUTH || LOCAL_DEV_CALLBACK_AUTH_VALUE;

const cases = [
  {
    file: 'correction-request-phone.json',
    expect: 200,
    note: 'CorrectionRequest — phone in identities; PUT to Vibes'
  },
  {
    file: 'correction-request-context-phone.json',
    expect: 200,
    note: 'CorrectionRequest — phone in context; PUT to Vibes'
  },
  {
    file: 'correction-request-formdata-phone.json',
    expect: 200,
    note: 'CorrectionRequest — phone in subject.formData; POST to Vibes'
  },
  {
    file: 'correction-status-event-phone.json',
    expect: 204,
    note: 'CorrectionStatusEvent — phone in event envelope; PUT to Vibes'
  },
  {
    file: 'correction-request-no-phone.json',
    expect: 204,
    note: 'CorrectionRequest — no phone; no Vibes call'
  },
  {
    file: 'consent-request.json',
    expect: 204,
    note: 'ConsentRequest — ignored for phone sync; no Vibes call'
  }
];

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

  const ok = response.status === testCase.expect;
  const prefix = ok ? 'OK' : 'FAIL';
  console.log(
    `${prefix}  ${testCase.file}  →  ${response.status} (expected ${testCase.expect})`
  );
  console.log(`      ${testCase.note}`);
  if (!ok) {
    const text = await response.text();
    if (text) {
      console.log(`      body: ${text.slice(0, 200)}`);
    }
    process.exitCode = 1;
  }
}

async function main() {
  console.log(`Smoke testing ${baseUrl}/ketch/webhook\n`);
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
