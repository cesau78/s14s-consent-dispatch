# Function reference and sequence control

Complete catalog of functions in `src/`, with parameters, return values, control flow, and call order. See [ARCHITECTURE.md](ARCHITECTURE.md) for system context.

## Shared types

| Name | Shape | Used by |
|------|--------|---------|
| **DispatchResult** | `{ status: 200, body: { downstream: DownstreamEntry[] } }` | All callback-handlers |
| **DownstreamEntry** | `{ system: string, update: number, updated: string }` | `callbackResponse.buildDownstreamEntry` |
| **Handler error** | `Error` with `error.status` (HTTP) and optional `error.body` | Thrown to Express error middleware |

---

## Entry and HTTP layer

### `src/server.js`

| Step | Action |
|------|--------|
| 1 | `require('dotenv').config()` |
| 2 | `app.listen(config.port)` |

### `src/app.js`

| Step | Action |
|------|--------|
| 1 | `express.json({ limit: '1mb' })` |
| 2 | Register `GET /health` |
| 3 | For each `config.ketchCallbackPaths`: `POST` → IP allowlist → auth → `ketchCallbackHandler` |
| 4 | `POST config.vibesCallbackPath` → Vibes IP allowlist → auth → `vibesCallbackHandler` |
| 5 | Error middleware: `error.status` (default 500), optional `error.body` → JSON |

### `src/routes/ketchCallbackHandler.js`

#### `ketchCallbackHandler(req, res, next)`

| | |
|-|-|
| **Sequence** | `dispatchKetchCallback(req.body)` → `res.status(result.status).json(result.body)` or `next(error)` |
| **Returns** | Express response (via `res`) |

### `src/routes/vibesCallbackHandler.js`

#### `vibesCallbackHandler(req, res, next)`

| | |
|-|-|
| **Sequence** | `processVibesSmsOptOut(req.body)` → JSON response or `next(error)` |

### Middleware (Ketch and Vibes use the same control pattern)

#### `ketchCallbackAuth` / `vibesCallbackAuth(req, res, next)`

```
1. expected = config.*CallbackAuthValue
   └─ if missing → 401, stop
2. headerValue = req.get(config.*CallbackAuthHeader)
   └─ if headerValue !== expected → 401, stop
3. if expected === LOCAL_DEV_CALLBACK_AUTH_VALUE AND NOT isLocalDevCaller(req)
   └─ → 403, stop
4. next()
```

#### `ketchCallbackIpAllowlist` / `vibesCallbackIpAllowlist(req, res, next)`

```
1. clientIp = getClientIp(req)
2. if NOT isIpAllowed(clientIp, config.*AllowedIps) → 403, stop
3. next()
```

---

## `src/services/ketchCallbackDispatcher.js`

### `dispatchKetchCallback(body)` → `Promise<DispatchResult>`

```
1. kind = body?.kind
   └─ if !kind → throw 400 "Missing Ketch message kind"
2. if CONSENT_KINDS.has(kind)
   └─ return processConsentRequest(body)     // ConsentRequest only
3. if NOT CORRECTION_KINDS.has(kind)
   └─ return buildDispatchResponse()         // empty downstream
4. phoneResult = await processPhoneCorrection(body)
   └─ if phoneResult → return phoneResult    // phone wins; stops here
5. emailResult = await processEmailCorrection(body)
   └─ if emailResult → return emailResult
6. return buildDispatchResponse()           // correction had no phone/email
```

**Kind sets** (`ketchCorrectionUtils.js`):

- `CONSENT_KINDS`: `ConsentRequest`
- `CORRECTION_KINDS`: `CorrectionRequest`, `CorrectionStatusEvent`

---

## Consent pipeline

### `parseConsentDispatchPayload(body)` → consent object | `null`

```
1. section = getEnvelopeSection(body)     // request, else event
   └─ if !section → null
2. smsDenied = isSmsMarketingDenied(purposes)
   emailDenied = isEmailMarketingDenied(purposes)
   └─ if neither → null
3. result = { sms: null, email: null }
4. if smsDenied:
     personKey = extractPersonKey(identities)
     └─ if personKey → result.sms = { personKey, skipVibes: isVibesSmsOptOutOrigin(context) }
5. if emailDenied:
     recipientId, externalRecipientId from identities
     └─ if either → result.email = { ..., skipMessageGears: isMessageGearsEmailOptOutOrigin(context) }
6. if !result.sms && !result.email → null
7. return result
```

### `processConsentRequest(body)` → `Promise<DispatchResult>`

```
1. consentChange = parseConsentDispatchPayload(body)
   └─ if !consentChange → buildDispatchResponse()
2. downstream = []
3. if consentChange.sms && !consentChange.sms.skipVibes
     await vibesClient.unsubscribePersonFromList(personKey)
     push DownstreamEntry('Vibes', status)
4. if consentChange.email && !consentChange.email.skipMessageGears
     await messageGearsClient.optOutRecipient({ recipientId, externalRecipientId })
     push DownstreamEntry('MessageGears', status)
5. return buildDispatchResponse(downstream)
```

**Note:** Steps 3 and 4 are sequential (not parallel). SMS runs before email when both apply.

### `parseSmsOptOutPayload(body)` → opt-out object | `null`

```
1. nested = body.message (if object) OR body.data (if object) OR body
2. message = readField(nested, message keys…)
   messageType = normalizeMessageType(readField(…))  // default ''
3. if messageType truthy AND messageType !== 'MO' → null
4. if NOT isOptOutKeyword(message) → null
5. personKey, phoneRaw = readField(…)
   phone = normalizePhoneToE164(phoneRaw)
6. if !personKey && !phone → null
7. return { personKey, phone, message, messageType: messageType || 'MO' }
```

### `isOptOutKeyword(message)` → `boolean`

```
1. normalized = trim(lower(message))
   └─ if empty → false
2. return config.vibesSmsOptOutKeywords.some(k => normalized === k)   // exact match
```

### `processVibesSmsOptOut(body)` → `Promise<DispatchResult>`

```
1. optOut = parseSmsOptOutPayload(body)
   └─ if !optOut → buildDispatchResponse()    // ack, no Ketch call
2. await ketchConsentClient.recordSmsMarketingOptOut({ personKey, phone })
3. return buildDispatchResponse([ DownstreamEntry('Ketch', status) ])
```

### `recordSmsMarketingOptOut({ personKey, phone, collectedAt })` → `Promise<{ status, body }>`

```
1. Validate KETCH_ORGANIZATION_CODE, PROPERTY_CODE, JURISDICTION_CODE
2. Validate personKey || phone
3. POST {KETCH_API_BASE_URL}/consent/{org}/update
   body = buildSetConsentBody(...)   // includes buildVibesSmsOptOutContext()
4. if !response.ok → throw with error.status
5. return { status, body }
```

### `isConsentOrigin(context, expectedOrigin)` → `boolean`

```
1. if !context or not object → false
2. Read config.ketchConsentOriginContextKey from context (case-insensitive key)
3. Compare value to expectedOrigin (case-insensitive)
```

---

## Correction pipeline

### `parsePhoneChangePayload(body)` → phone change | `null`

```
1. request = getEnvelopeSection(body)
2. phone = identities OR context OR subject (first hit)
   └─ if !phone → null
3. return { phone, personKey, externalPersonId } from identities
```

### `processPhoneCorrection(body)` → `Promise<DispatchResult | null>`

```
1. phoneChange = parsePhoneChangePayload(body)
   └─ if !phoneChange → null
2. if !personKey && !externalPersonId → throw 422
3. await vibesClient.updatePersonPhone(phoneChange)
4. return buildDispatchResponse([ Vibes entry ])
```

### `parseEmailChangePayload(body)` → email change | `null`

Same pattern as phone; uses email extractors from identities / context / subject.

### `processEmailCorrection(body)` → `Promise<DispatchResult | null>`

```
1. emailChange = parseEmailChangePayload(body)
   └─ if !emailChange → null
2. if !recipientId && !externalRecipientId → throw 422
3. await messageGearsClient.updateRecipientEmail(emailChange)
4. return buildDispatchResponse([ MessageGears entry ])
```

---

## Downstream clients

### `vibesClient.updatePersonPhone({ personKey, externalPersonId, phone })`

```
1. Validate VIBES_COMPANY_KEY, credentials
2. Build payload { mobile_phone: { mdn }, optional external_person_id }
3. if personKey → PUT .../persons/{personKey}
   else if externalPersonId → POST .../persons/
   else → throw
```

### `vibesClient.unsubscribePersonFromList(personKey, subscriptionListId?)`

```
1. Validate config + personKey + subscriptionListId (default from env)
2. try DELETE .../persons/{personKey}/subscriptions/{listId}
3. catch: if status === 404 → return { status: 204 }   // idempotent
   else rethrow
```

### `messageGearsClient.updateRecipientEmail` / `optOutRecipient`

Same branch: `recipientId` → PUT, else `externalRecipientId` → POST, else throw. Opt-out uses `config.messageGearsOptOutPayload` instead of `emailAddress`.

### `vibesRequest` / `messageGearsRequest`

```
1. fetch(url, { method, headers, body })
2. Parse response text (JSON or plain)
3. if !ok → throw Error with .status and .body
4. return { status, body }
```

---

## Utilities

| Function | Control summary |
|----------|-----------------|
| `getEnvelopeSection(body)` | `body.request` if object, else `body.event`, else `null` |
| `buildDispatchResponse(downstream?)` | Always `{ status: 200, body: { downstream } }` |
| `normalizePhoneToE164(raw, country?)` | Parse + validate via libphonenumber-js; invalid → `null` |
| `normalizeEmail(raw)` | trim, lower, regex validate; invalid → `null` |
| `getClientIp(req)` | First `X-Forwarded-For` hop, else `req.ip` / socket |
| `isIpAllowed(ip, entries)` | Empty list → `true`; else BlockList check |

---

## Full function index (alphabetical by file)

| File | Function | Exported |
|------|----------|----------|
| `callbackResponse.js` | `formatDownstreamTimestamp` | yes |
| | `buildDownstreamEntry` | yes |
| | `buildDispatchResponse` | yes |
| `clientIp.js` | `normalizeIp`, `getClientIp`, `getDirectClientIp`, `isLocalhost`, `isLocalMachinePeer`, `isLocalDevCaller` | yes |
| `config.js` | `splitList`, `env`, `envFirst`, `parseTrustProxy`, `config` getters | partial |
| `consentOrigin.js` | `isConsentOrigin`, `isVibesSmsOptOutOrigin`, `isMessageGearsEmailOptOutOrigin`, `buildVibesSmsOptOutContext` | yes |
| `emailNormalizer.js` | `normalizeEmail` | yes |
| `ipAllowlist.js` | `parseIpFamily`, `addAllowedEntry`, `createAllowlist`, `isIpAllowed` | partial |
| `ketchCallbackDispatcher.js` | `dispatchKetchCallback` | yes |
| `ketchConsentClient.js` | `buildIdentities`, `buildSetConsentBody`, `recordSmsMarketingOptOut` | partial |
| `ketchConsentPayloadParser.js` | `matchesSpace`, `extractPersonKey`, `extractRecipientId`, `extractExternalRecipientId`, `isPurposeDenied`, `isSmsMarketingDenied`, `isEmailMarketingDenied`, `parseConsentDispatchPayload` | partial |
| `ketchCorrectionUtils.js` | `getEnvelopeSection`, `CORRECTION_KINDS`, `CONSENT_KINDS` | yes |
| `ketchPayloadParser.js` | 16 extract/parse helpers (see source JSDoc) | partial |
| `ketchPhoneCallbackHandler.js` | `processPhoneCorrection` | yes |
| `ketchEmailCallbackHandler.js` | `processEmailCorrection` | yes |
| `ketchConsentCallbackHandler.js` | `processConsentRequest` | yes |
| `messageGearsClient.js` | `getAuthHeader`, `buildRecipientUrl`, `buildRecipientCollectionUrl`, `messageGearsRequest`, `updateRecipientEmail`, `optOutRecipient` | partial |
| `phoneNormalizer.js` | `normalizePhoneToE164` | yes |
| `vibesClient.js` | `getAuthHeader`, `buildPersonUrl`, `buildPersonCollectionUrl`, `buildSubscriptionUrl`, `vibesRequest`, `updatePersonPhone`, `unsubscribePersonFromList` | partial |
| `vibesInboundParser.js` | `readField`, `normalizeMessageType`, `isOptOutKeyword`, `parseSmsOptOutPayload` | partial |
| `vibesSmsOptOutCallbackHandler.js` | `processVibesSmsOptOut` | yes |

Internal helpers are documented with JSDoc in source; use your editor or `grep "^function\\|^async function"` under `src/`.
