/**
 * Environment-backed configuration. Values are read on each access so tests can
 * override `process.env` without restarting the process.
 *
 * Env files: `.env.example` / `.env.dev` — blocks are Ketch, then Vibes, then MessageGears.
 */
const config = {
  // --- Server ----------------------------------------------------------------
  get port() {
    return Number(env('PORT')) || 3000;
  },
  get trustProxy() {
    return parseTrustProxy(env('TRUST_PROXY', 'false'));
  },

  // --- Ketch -----------------------------------------------------------------
  get ketchCallbackPaths() {
    return splitList(
      envFirst(
        ['KETCH_CALLBACK_PATHS', 'KETCH_WEBHOOK_PATHS'],
        '/ketch/webhook,/ketch/forwarder'
      )
    );
  },
  get ketchCallbackAuthHeader() {
    return envFirst(['KETCH_CALLBACK_AUTH_HEADER', 'KETCH_WEBHOOK_AUTH_HEADER'], 'Authorization');
  },
  get ketchCallbackAuthValue() {
    const raw = envFirst([
      'KETCH_CALLBACK_AUTH_VALUE',
      'KETCH_WEBHOOK_AUTH_VALUE',
      'KETCH_FORWARDER_AUTH'
    ]);
    if (!raw || !String(raw).trim()) {
      return undefined;
    }
    return String(raw).trim();
  },
  get ketchAllowedIps() {
    return splitList(env('KETCH_ALLOWED_IPS'));
  },
  get ketchApiBaseUrl() {
    return env('KETCH_API_BASE_URL', 'https://global.ketchcdn.com/web/v2');
  },
  get ketchApiKey() {
    return env('KETCH_API_KEY');
  },
  get ketchOrganizationCode() {
    return env('KETCH_ORGANIZATION_CODE');
  },
  get ketchPropertyCode() {
    return env('KETCH_PROPERTY_CODE');
  },
  get ketchEnvironmentCode() {
    return env('KETCH_ENVIRONMENT_CODE', 'production');
  },
  get ketchJurisdictionCode() {
    return env('KETCH_JURISDICTION_CODE');
  },
  get ketchSmsMarketingPurposeCodes() {
    return splitList(env('KETCH_SMS_MARKETING_PURPOSE_CODES', 'sms_mktg'));
  },
  get ketchEmailMarketingPurposeCodes() {
    return splitList(env('KETCH_EMAIL_MARKETING_PURPOSE_CODES', 'email_mktg'));
  },
  get ketchConsentOriginContextKey() {
    return env('KETCH_CONSENT_ORIGIN_CONTEXT_KEY', 'consent_dispatch_origin');
  },
  get ketchConsentOriginVibesSms() {
    return env('KETCH_CONSENT_ORIGIN_VIBES_SMS', 'vibes_sms_optout');
  },
  get ketchConsentOriginMessageGearsEmail() {
    return env('KETCH_CONSENT_ORIGIN_MESSAGEGEARS_EMAIL', 'messagegears_email_optout');
  },
  get ketchVibesPersonKeyIdentitySpaces() {
    return splitList(
      env('KETCH_VIBES_PERSON_KEY_IDENTITY_SPACES', 'vibes_person_key,person_key')
    );
  },
  get ketchExternalPersonIdIdentitySpaces() {
    return splitList(
      env('KETCH_EXTERNAL_PERSON_ID_IDENTITY_SPACES', 'account_id,external_person_id,customer_id')
    );
  },
  get ketchPhoneIdentitySpaces() {
    return splitList(env('KETCH_PHONE_IDENTITY_SPACES', 'phone,mobile,mdn,mobile_phone'));
  },
  get ketchPhoneContextKeys() {
    return splitList(env('KETCH_PHONE_CONTEXT_KEYS', 'phone,mobilePhone,mobile_phone,mdn'));
  },
  get ketchEmailIdentitySpaces() {
    return splitList(env('KETCH_EMAIL_IDENTITY_SPACES', 'email,email_address'));
  },
  get ketchEmailContextKeys() {
    return splitList(env('KETCH_EMAIL_CONTEXT_KEYS', 'email,emailAddress,email_address'));
  },
  get ketchMessageGearsRecipientIdIdentitySpaces() {
    return splitList(
      env('KETCH_MESSAGEGEARS_RECIPIENT_ID_IDENTITY_SPACES', 'messagegears_recipient_id,recipient_id')
    );
  },
  get ketchMessageGearsExternalRecipientIdIdentitySpaces() {
    return splitList(
      env(
        'KETCH_MESSAGEGEARS_EXTERNAL_RECIPIENT_ID_IDENTITY_SPACES',
        'account_id,external_person_id,customer_id,external_recipient_id'
      )
    );
  },

  // --- Vibes -----------------------------------------------------------------
  get vibesCallbackPath() {
    return env('VIBES_CALLBACK_PATH', '/vibes/webhook');
  },
  get vibesCallbackAuthHeader() {
    return env('VIBES_CALLBACK_AUTH_HEADER', 'Authorization');
  },
  get vibesCallbackAuthValue() {
    const raw = env('VIBES_CALLBACK_AUTH_VALUE');
    if (!raw || !String(raw).trim()) {
      return undefined;
    }
    return String(raw).trim();
  },
  get vibesAllowedIps() {
    return splitList(env('VIBES_ALLOWED_IPS'));
  },
  get vibesSmsOptOutKeywords() {
    return splitList(env('VIBES_SMS_OPT_OUT_KEYWORDS', 'no')).map((entry) =>
      entry.toLowerCase()
    );
  },
  get vibesApiBaseUrl() {
    return env('VIBES_API_BASE_URL', 'https://public-api.vibescm.com');
  },
  get vibesCompanyKey() {
    return env('VIBES_COMPANY_KEY');
  },
  get vibesApiUsername() {
    return env('VIBES_API_USERNAME');
  },
  get vibesApiPassword() {
    return env('VIBES_API_PASSWORD');
  },
  get vibesApiVersion() {
    return env('VIBES_API_VERSION', '2');
  },
  get vibesSmsSubscriptionListId() {
    return env('VIBES_SMS_SUBSCRIPTION_LIST_ID');
  },

  // --- MessageGears ----------------------------------------------------------
  get messageGearsApiBaseUrl() {
    return env('MESSAGEGEARS_API_BASE_URL', 'https://api.messagegears.com');
  },
  get messageGearsAccountId() {
    return env('MESSAGEGEARS_ACCOUNT_ID');
  },
  get messageGearsApiKey() {
    return env('MESSAGEGEARS_API_KEY');
  },
  get messageGearsOptOutPayload() {
    const raw = env('MESSAGEGEARS_OPT_OUT_PAYLOAD_JSON');
    if (!raw || !String(raw).trim()) {
      return { emailOptIn: false };
    }

    return JSON.parse(raw);
  }
};

/** splitList — comma-separated env → trimmed string array. */
function splitList(value) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** env — process.env[name] or default. */
function env(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

/** envFirst — first set name in list wins (legacy alias support). */
function envFirst(names, defaultValue = '') {
  for (const name of names) {
    if (process.env[name]) {
      return process.env[name];
    }
  }
  return defaultValue;
}

/** parseTrustProxy — TRUST_PROXY env: true, false, or hop count for X-Forwarded-For. */
function parseTrustProxy(value) {
  if (value === 'true') {
    return true;
  }
  if (value === 'false' || value === '') {
    return false;
  }

  const hops = Number(value);
  return Number.isFinite(hops) ? hops : false;
}

const LOCAL_DEV_CALLBACK_AUTH_VALUE = 'Bearer local-dev';

module.exports = config;
module.exports.LOCAL_DEV_CALLBACK_AUTH_VALUE = LOCAL_DEV_CALLBACK_AUTH_VALUE;
