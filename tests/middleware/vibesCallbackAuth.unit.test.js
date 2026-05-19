jest.mock('../../src/services/clientIp', () => ({
  isLocalDevCaller: jest.fn()
}));

const { LOCAL_DEV_CALLBACK_AUTH_VALUE } = require('../../src/config');
const { isLocalDevCaller } = require('../../src/services/clientIp');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('vibesCallbackAuth middleware', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('returns 403 for local-dev auth from a non-local peer', () => {
    process.env.VIBES_CALLBACK_AUTH_VALUE = LOCAL_DEV_CALLBACK_AUTH_VALUE;
    jest.resetModules();
    const { isLocalDevCaller: localDevCheck } = require('../../src/services/clientIp');
    localDevCheck.mockReturnValue(false);
    const middleware = require('../../src/middleware/vibesCallbackAuth');
    const next = jest.fn();
    const res = createRes();
    const req = {
      get: jest.fn().mockReturnValue(LOCAL_DEV_CALLBACK_AUTH_VALUE)
    };

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when header does not match configured secret', () => {
    process.env.VIBES_CALLBACK_AUTH_VALUE = 'Bearer production-secret';
    jest.resetModules();
    const middleware = require('../../src/middleware/vibesCallbackAuth');
    const next = jest.fn();
    const res = createRes();
    const req = {
      get: jest.fn().mockReturnValue('Bearer wrong')
    };

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
