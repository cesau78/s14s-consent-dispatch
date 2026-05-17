const express = require('express');
const config = require('./config');
const ketchWebhookGuard = require('./middleware/ketchWebhookGuard');
const ketchWebhookHandler = require('./routes/ketchWebhookHandler');

const app = express();

app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

for (const path of config.ketchWebhookPaths) {
  app.post(path, ketchWebhookGuard, ketchWebhookHandler);
}

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
