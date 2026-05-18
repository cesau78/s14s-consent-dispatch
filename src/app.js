/**
 * Express application: health check, configurable Ketch callback routes, and a
 * shared error handler for callback-handlers and downstream API failures.
 */
const express = require('express');
const config = require('./config');
const ketchCallbackIpAllowlist = require('./middleware/ketchCallbackIpAllowlist');
const ketchCallbackAuth = require('./middleware/ketchCallbackAuth');
const ketchCallbackHandler = require('./routes/ketchCallbackHandler');

const app = express();

app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Each path from KETCH_CALLBACK_PATHS is a separate Ketch Forwarder endpoint URL.
for (const path of config.ketchCallbackPaths) {
  app.post(path, ketchCallbackIpAllowlist, ketchCallbackAuth, ketchCallbackHandler);
}

// Callback-handlers attach error.status (and optional error.body from Vibes).
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
