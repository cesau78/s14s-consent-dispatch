/**
 * Express application: health check, configurable Ketch webhook routes, and a
 * shared error handler for callback-handlers and downstream API failures.
 */
const express = require('express');
const config = require('./config');
const ketchWebhookIpAllowlist = require('./middleware/ketchWebhookIpAllowlist');
const ketchWebhookAuth = require('./middleware/ketchWebhookAuth');
const ketchWebhookHandler = require('./routes/ketchWebhookHandler');

const app = express();

app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Each path from KETCH_WEBHOOK_PATHS is a separate Ketch Forwarder endpoint URL.
for (const path of config.ketchWebhookPaths) {
  app.post(path, ketchWebhookIpAllowlist, ketchWebhookAuth, ketchWebhookHandler);
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
