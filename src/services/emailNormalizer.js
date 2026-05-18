/**
 * Normalize email addresses for MessageGears profile updates.
 */
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
