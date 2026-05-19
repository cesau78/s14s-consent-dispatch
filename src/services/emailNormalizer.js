/**
 * Email normalization for MessageGears recipient profiles.
 */

/** normalizeEmail — trim, lowercase, basic format check; null if invalid. */
function normalizeEmail(rawEmail) {
  if (rawEmail == null) {
    return null;
  }

  const trimmed = String(rawEmail).trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

module.exports = {
  normalizeEmail
};
