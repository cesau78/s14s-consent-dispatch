const request = require('supertest');

process.env.VIBES_CALLBACK_AUTH_VALUE = 'Bearer vibes-token';
process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer ketch-token';
process.env.KETCH_ORGANIZATION_CODE = 'org-1';
process.env.KETCH_PROPERTY_CODE = 'prop-1';
process.env.KETCH_ENVIRONMENT_CODE = 'production';
process.env.KETCH_JURISDICTION_CODE = 'usca';

const app = require('../../src/app');
const ketchConsentClient = require('../../src/services/ketchConsentClient');

jest.mock('../../src/services/ketchConsentClient');

describe('POST /vibes/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ketchConsentClient.recordSmsMarketingOptOut.mockResolvedValue({ status: 204, body: null });
  });

  test('rejects unauthorized requests', async () => {
    const res = await request(app).post('/vibes/webhook').send({
      person_key: 'person-123',
      message: 'no',
      message_type: 'MO'
    });

    expect(res.status).toBe(401);
  });

  test('records Ketch opt-out for MO no reply', async () => {
    const res = await request(app)
      .post('/vibes/webhook')
      .set('Authorization', 'Bearer vibes-token')
      .send({
        person_key: 'person-123',
        phone_number_e164_format: '+12145551234',
        message: 'no',
        message_type: 'MO'
      });

    expect(res.status).toBe(200);
    expect(ketchConsentClient.recordSmsMarketingOptOut).toHaveBeenCalledWith({
      personKey: 'person-123',
      phone: '+12145551234'
    });
    expect(res.body.downstream[0].system).toBe('Ketch');
  });

  test('propagates Ketch API errors', async () => {
    const error = new Error('Ketch API 502');
    error.status = 502;
    error.body = { reason: 'bad gateway' };
    ketchConsentClient.recordSmsMarketingOptOut.mockRejectedValue(error);

    const res = await request(app)
      .post('/vibes/webhook')
      .set('Authorization', 'Bearer vibes-token')
      .send({
        person_key: 'person-123',
        message: 'no',
        message_type: 'MO'
      });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Ketch API 502');
  });
});
