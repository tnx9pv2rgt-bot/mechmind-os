/**
 * instrument.spec.ts — Tests for Sentry instrumentation setup
 */

const mockInit = jest.fn();

jest.mock('@sentry/nestjs', () => ({
  init: mockInit,
}));

jest.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: jest.fn().mockReturnValue({ name: 'ProfilingIntegration' }),
}));

const ORIGINAL_ENV_INSTRUMENT = process.env;

describe('instrument', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV_INSTRUMENT };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV_INSTRUMENT;
  });

  it('should not init Sentry when SENTRY_DSN is not set', async () => {
    delete process.env.SENTRY_DSN;

    await import('./instrument');

    expect(mockInit).not.toHaveBeenCalled();
  });

  it('should init Sentry when SENTRY_DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://abc@sentry.io/123';

    await import('./instrument');

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://abc@sentry.io/123',
      }),
    );
  });

  it('should use development environment by default', async () => {
    process.env.SENTRY_DSN = 'https://abc@sentry.io/123';
    delete process.env.NODE_ENV;

    await import('./instrument');

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'development',
      }),
    );
  });

  it('should use production environment when set', async () => {
    process.env.SENTRY_DSN = 'https://abc@sentry.io/123';
    process.env.NODE_ENV = 'production';

    await import('./instrument');

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'production',
      }),
    );
  });

  it('should set lower sample rates in production', async () => {
    process.env.SENTRY_DSN = 'https://abc@sentry.io/123';
    process.env.NODE_ENV = 'production';

    await import('./instrument');

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
      }),
    );
  });

  it('should set full sample rates in development', async () => {
    process.env.SENTRY_DSN = 'https://abc@sentry.io/123';
    process.env.NODE_ENV = 'development';

    await import('./instrument');

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
      }),
    );
  });

  it('should include profiling integration', async () => {
    process.env.SENTRY_DSN = 'https://abc@sentry.io/123';

    await import('./instrument');

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: expect.arrayContaining([
          expect.objectContaining({ name: 'ProfilingIntegration' }),
        ]),
      }),
    );
  });
});
