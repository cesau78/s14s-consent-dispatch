/**
 * Express app — route registration and global error handler.
 *
 * Ketch POST chain: IP allowlist → shared-secret auth → ketchCallbackHandler
 * Vibes POST chain: IP allowlist → shared-secret auth → vibesCallbackHandler
 */
const express = require('express');
const config = require('./config');
const ketchCallbackIpAllowlist = require('./middleware/ketchCallbackIpAllowlist');
const ketchCallbackAuth = require('./middleware/ketchCallbackAuth');
const ketchCallbackHandler = require('./routes/ketchCallbackHandler');
const vibesCallbackIpAllowlist = require('./middleware/vibesCallbackIpAllowlist');
const vibesCallbackAuth = require('./middleware/vibesCallbackAuth');
const vibesCallbackHandler = require('./routes/vibesCallbackHandler');

const app = express();

app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// KETCH_CALLBACK_PATHS — each path is a separate Forwarder webhook URL
for (const path of config.ketchCallbackPaths) {
  app.post(path, ketchCallbackIpAllowlist, ketchCallbackAuth, ketchCallbackHandler);
}

// VIBES_CALLBACK_PATH — inbound MO opt-out keywords
app.post(
  config.vibesCallbackPath,
  vibesCallbackIpAllowlist,
  vibesCallbackAuth,
  vibesCallbackHandler
);

/**
 * Error middleware — handlers set error.status; downstream APIs may set error.body → details.
 * Sequence: status = error.status || 500 → JSON { error, details? }
 */
app.use((error, req, res, next) => {
  const status = error.status || 500;
  const payload = {
    error: error.message || 'Internal Server Error'
  };

  if (error.body) {
    payload.details = error.body;
  }

  res.status(status).json(payload);
});

module.exports = app;
