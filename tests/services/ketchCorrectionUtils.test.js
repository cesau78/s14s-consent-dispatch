const {
  CORRECTION_KINDS,
  getEnvelopeSection
} = require('../../src/services/ketchCorrectionUtils');

describe('ketchCorrectionUtils', () => {
  test('getEnvelopeSection reads request and event envelopes', () => {
    expect(getEnvelopeSection({ request: { identities: [] } })).toEqual({ identities: [] });
    expect(getEnvelopeSection({ event: { status: 'pending' } })).toEqual({ status: 'pending' });
    expect(getEnvelopeSection({})).toBeNull();
  });

  test('CORRECTION_KINDS includes correction request and status event', () => {
    expect(CORRECTION_KINDS.has('CorrectionRequest')).toBe(true);
    expect(CORRECTION_KINDS.has('CorrectionStatusEvent')).toBe(true);
    expect(CORRECTION_KINDS.has('ConsentRequest')).toBe(false);
  });
});
