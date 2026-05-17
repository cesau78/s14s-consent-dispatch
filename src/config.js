function splitList(value) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function env(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

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

const config = {
  get port() {
    return Number(env('PORT')) || 3000;
  },
  get trustProxy() {
    return parseTrustProxy(env('TRUST_PROXY', 'false'));
  },
  get ketchWebhookPaths() {
    return splitList(env('KETCH_WEBHOOK_PATHS', '/ketch/webhook,/ketch/forwarder'));
  },
  get ketchWebhookAuthHeader() {
    return env('KETCH_WEBHOOK_AUTH_HEADER', 'Authorization');
  },
  get ketchWebhookAuthValue() {
    return env('KETCH_WEBHOOK_AUTH_VALUE') || env('KETCH_FORWARDER_AUTH');
  },
  get ketchAllowedIps() {
    return splitList(env('KETCH_ALLOWED_IPS'));
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
  }
};

module.exports = config;
