// Process entry point: load .env, then start the HTTP server.
require('dotenv').config();
const app = require('./app');
const config = require('./config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`S14S Consent Dispatch running on port ${PORT}`);
});
