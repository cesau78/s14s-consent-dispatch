/**
 * Environment-backed configuration. Values are read on each access so tests can
 * override process.env without restarting the process.
 */

/** Parse comma-separated env vars (e.g. callback paths, allowed IPs, identity spaces). */
function splitList(value) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function env(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

/** First defined env var wins (supports renamed keys with legacy fallbacks). */
function envFirst(names, defaultValue = '') {
  for (const name of names) {
    if (process.env[name]) {
      return process.env[name];
    }
  }
  return defaultValue;
}

/**
 * Express "trust proxy" setting. Use true (or a hop count) when running behind a
 * load balancer so X-Forwarded-For is honored for IP allowlisting.
 */
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
  /** POST paths registered for inbound Ketch callbacks (see KETCH_CALLBACK_PATHS). */
  get ketchCallbackPaths() {
    return splitList(
      envFirst(
        ['KETCH_CALLBACK_PATHS', 'KETCH_WEBHOOK_PATHS'],
        '/ketch/webhook,/ketch/forwarder'
      )
    );
  },
  /** Header name Ketch must send (configured to match the Ketch Forwarder endpoint). */
  get ketchCallbackAuthHeader() {
    return envFirst(['KETCH_CALLBACK_AUTH_HEADER', 'KETCH_WEBHOOK_AUTH_HEADER'], 'Authorization');
  },
  /** Shared secret Ketch includes on outbound callback calls (server-to-server only). */
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
  /** When empty, all caller IPs are accepted; otherwise only listed IPs/CIDRs. */
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
  /** API v2 expects MDNs in E.164 format (+1...). */
  get vibesApiVersion() {
    return env('VIBES_API_VERSION', '2');
  }
};

/** Local-only callback secret; also requires a loopback / Docker bridge TCP peer. */
const LOCAL_DEV_CALLBACK_AUTH_VALUE = 'Bearer local-dev';

module.exports = config;
module.exports.LOCAL_DEV_CALLBACK_AUTH_VALUE = LOCAL_DEV_CALLBACK_AUTH_VALUE;
