const request = require('supertest');

const originalAuth = process.env.KETCH_CALLBACK_AUTH_VALUE;
process.env.KETCH_CALLBACK_AUTH_VALUE = 'Bearer test-token';
delete process.env.KETCH_FORWARDER_AUTH;
process.env.VIBES_COMPANY_KEY = 'company-1';
process.env.VIBES_API_USERNAME = 'user';
process.env.VIBES_API_PASSWORD = 'pass';
process.env.MESSAGEGEARS_ACCOUNT_ID = 'account-1';
process.env.MESSAGEGEARS_API_KEY = 'mg-key';

const app = require('../../src/app');
const vibesClient = require('../../src/services/vibesClient');
const messageGearsClient = require('../../src/services/messageGearsClient');

jest.mock('../../src/services/vibesClient');
jest.mock('../../src/services/messageGearsClient');

describe('POST /ketch/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vibesClient.updatePersonPhone.mockResolvedValue({ status: 200, body: { person_key: 'person-123' } });
    messageGearsClient.updateRecipientEmail.mockResolvedValue({
      status: 200,
      body: { recipientId: 'mg-recipient-abc123' }
    });
  });

  afterAll(() => {
    process.env.KETCH_CALLBACK_AUTH_VALUE = originalAuth;
  });

  test('rejects unauthorized requests', async () => {
    const res = await request(app)
      .post('/ketch/webhook')
      .send({ kind: 'CorrectionRequest' });

    expect(res.status).toBe(401);
  });

  test('accepts correction requests and returns downstream details', async () => {
    const res = await request(app)
      .post('/ketch/webhook')
      .set('Authorization', 'Bearer test-token')
      .send({
        apiVersion: 'dsr/v1',
        kind: 'CorrectionRequest',
        metadata: { uid: 'req-1', tenant: 'brand' },
        request: {
          identities: [
            { identitySpace: 'person_key', identityValue: 'person-123' },
            { identitySpace: 'phone', identityValue: '+12145551234' }
          ]
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.downstream).toEqual([
      expect.objectContaining({
        system: 'Vibes',
        update: 200
      })
    ]);
    expect(vibesClient.updatePersonPhone).toHaveBeenCalledTimes(1);
  });

  test('/ketch/forwarder is an alias of /ketch/webhook', async () => {
    const res = await request(app)
      .post('/ketch/forwarder')
      .set('Authorization', 'Bearer test-token')
      .send({
        kind: 'ConsentRequest',
        request: {}
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ downstream: [] });
  });
});
