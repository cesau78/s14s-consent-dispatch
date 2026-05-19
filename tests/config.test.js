describe('config', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetModules();
  });

  test('reads trust proxy settings from the environment', () => {
    process.env.TRUST_PROXY = 'true';
    jest.resetModules();
    expect(require('../src/config').trustProxy).toBe(true);

    process.env.TRUST_PROXY = '2';
    jest.resetModules();
    expect(require('../src/config').trustProxy).toBe(2);

    process.env.TRUST_PROXY = 'not-a-number';
    jest.resetModules();
    expect(require('../src/config').trustProxy).toBe(false);

    process.env.TRUST_PROXY = '';
    jest.resetModules();
    expect(require('../src/config').trustProxy).toBe(false);
  });

  test('treats blank callback auth values as unset', () => {
    process.env.KETCH_CALLBACK_AUTH_VALUE = '  ';
    delete process.env.KETCH_FORWARDER_AUTH;
    jest.resetModules();
    expect(require('../src/config').ketchCallbackAuthValue).toBeUndefined();
  });

  test('parses list-based settings and legacy env aliases', () => {
    process.env.KETCH_WEBHOOK_PATHS = '/a,/b';
    process.env.KETCH_FORWARDER_AUTH = 'legacy-secret';
    delete process.env.KETCH_CALLBACK_PATHS;
    delete process.env.KETCH_CALLBACK_AUTH_VALUE;
    delete process.env.KETCH_WEBHOOK_AUTH_VALUE;
    jest.resetModules();
    const config = require('../src/config');

    expect(config.ketchCallbackPaths).toEqual(['/a', '/b']);
    expect(config.ketchCallbackAuthValue).toBe('legacy-secret');
  });

  test('defaults port when PORT is not numeric', () => {
    process.env.PORT = 'abc';
    jest.resetModules();
    expect(require('../src/config').port).toBe(3000);
  });

  test('reads vibes and ketch consent settings from the environment', () => {
    process.env.VIBES_CALLBACK_PATH = '/hooks/vibes';
    process.env.VIBES_CALLBACK_AUTH_VALUE = ' Bearer vibes ';
    process.env.VIBES_SMS_OPT_OUT_KEYWORDS = 'no,stop';
    process.env.KETCH_API_BASE_URL = 'https://ketch.example/v2';
    process.env.KETCH_SMS_MARKETING_PURPOSE_CODES = 'sms_mktg,custom_sms';
    jest.resetModules();
    const config = require('../src/config');

    expect(config.vibesCallbackPath).toBe('/hooks/vibes');
    expect(config.vibesCallbackAuthValue).toBe('Bearer vibes');
    expect(config.vibesSmsOptOutKeywords).toEqual(['no', 'stop']);
    expect(config.ketchApiBaseUrl).toBe('https://ketch.example/v2');
    expect(config.ketchSmsMarketingPurposeCodes).toEqual(['sms_mktg', 'custom_sms']);
  });

  test('treats blank vibes callback auth as unset', () => {
    process.env.VIBES_CALLBACK_AUTH_VALUE = '  ';
    jest.resetModules();
    expect(require('../src/config').vibesCallbackAuthValue).toBeUndefined();
  });
});
