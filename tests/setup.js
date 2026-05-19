/**
 * Default test env: require IP allowlists (deny-all if unset) and trust X-Forwarded-For
 * so supertest can pass allowlist checks via 127.0.0.1.
 */
if (!process.env.KETCH_ALLOWED_IPS) {
  process.env.KETCH_ALLOWED_IPS = '127.0.0.1,::1';
}
if (!process.env.VIBES_ALLOWED_IPS) {
  process.env.VIBES_ALLOWED_IPS = '127.0.0.1,::1';
}
if (!process.env.TRUST_PROXY) {
  process.env.TRUST_PROXY = 'true';
}
