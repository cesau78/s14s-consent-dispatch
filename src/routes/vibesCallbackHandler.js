/**
 * HTTP adapter: Vibes inbound POST → processVibesSmsOptOut → JSON response.
 */
const { processVibesSmsOptOut } = require('../callback-handlers/vibesSmsOptOutCallbackHandler');

/**
 * vibesCallbackHandler — try/catch wrapper; errors go to app.js error middleware.
 */
async function vibesCallbackHandler(req, res, next) {
  try {
    const result = await processVibesSmsOptOut(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
}

module.exports = vibesCallbackHandler;
