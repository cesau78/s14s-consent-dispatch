const {
  formatDownstreamTimestamp,
  buildDownstreamEntry,
  buildDispatchResponse
} = require('../../src/services/callbackResponse');

describe('callbackResponse', () => {
  test('formatDownstreamTimestamp defaults to the current time', () => {
    expect(formatDownstreamTimestamp()).toMatch(/^\d{8}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  test('formatDownstreamTimestamp uses compact UTC form', () => {
    const timestamp = formatDownstreamTimestamp(new Date('2026-05-01T12:12:12.123Z'));
    expect(timestamp).toBe('20260501T12:12:12.123');
  });

  test('buildDownstreamEntry describes a downstream update', () => {
    const entry = buildDownstreamEntry(
      'MessageGears',
      200,
      new Date('2026-05-01T12:12:12.123Z')
    );

    expect(entry).toEqual({
      system: 'MessageGears',
      update: 200,
      updated: '20260501T12:12:12.123'
    });
  });

  test('buildDispatchResponse always returns HTTP 200 with a downstream array', () => {
    expect(buildDispatchResponse()).toEqual({
      status: 200,
      body: { downstream: [] }
    });
  });
});
