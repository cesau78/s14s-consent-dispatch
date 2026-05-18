/**
 * Standard dispatch response returned for all successful Ketch callback handling.
 */

function formatDownstreamTimestamp(date = new Date()) {
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}T` +
    `${pad(date.getUTCHours())}:` +
    `${pad(date.getUTCMinutes())}:` +
    `${pad(date.getUTCSeconds())}.` +
    `${pad(date.getUTCMilliseconds(), 3)}`
  );
}

function buildDownstreamEntry(system, updateStatus, updatedAt = new Date()) {
  return {
    system,
    update: updateStatus,
    updated: formatDownstreamTimestamp(updatedAt)
  };
}

function buildDispatchResponse(downstream = []) {
  return {
    status: 200,
    body: {
      downstream
    }
  };
}

module.exports = {
  formatDownstreamTimestamp,
  buildDownstreamEntry,
  buildDispatchResponse
};
