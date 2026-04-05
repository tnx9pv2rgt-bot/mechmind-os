/**
 * telemetry.spec.ts — Tests for OpenTelemetry setup
 */

// Mock OpenTelemetry modules
const mockStart = jest.fn();
const mockShutdown = jest.fn().mockResolvedValue(undefined);

jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: mockStart,
    shutdown: mockShutdown,
  })),
}));

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn().mockReturnValue([]),
}));

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: jest.fn().mockReturnValue({}),
}));

jest.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version',
}));

jest.mock('@opentelemetry/sdk-trace-node', () => ({
  ParentBasedSampler: jest.fn().mockImplementation(() => ({})),
  TraceIdRatioBasedSampler: jest.fn().mockImplementation(() => ({})),
  AlwaysOnSampler: jest.fn().mockImplementation(() => ({})),
  BatchSpanProcessor: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@prisma/instrumentation', () => ({
  PrismaInstrumentation: jest.fn().mockImplementation(() => ({})),
}));

const ORIGINAL_ENV_TELEMETRY = process.env;

describe('telemetry', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV_TELEMETRY };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV_TELEMETRY;
  });

  it('should not start SDK when OTEL_EXPORTER_OTLP_ENDPOINT is not set', async () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_ENABLED;

    await import('./telemetry');

    expect(mockStart).not.toHaveBeenCalled();
  });

  it('should start SDK when OTEL_EXPORTER_OTLP_ENDPOINT is set', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

    await import('./telemetry');

    expect(mockStart).toHaveBeenCalled();
  });

  it('should start SDK when OTEL_ENABLED is true', async () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    process.env.OTEL_ENABLED = 'true';

    await import('./telemetry');

    expect(mockStart).toHaveBeenCalled();
  });

  it('should configure OTLPTraceExporter with correct URL', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://collector:4318';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

    await import('./telemetry');

    expect(OTLPTraceExporter).toHaveBeenCalledWith({
      url: 'http://collector:4318/v1/traces',
    });
  });

  it('should configure PrismaInstrumentation', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaInstrumentation } = require('@prisma/instrumentation');

    await import('./telemetry');

    expect(PrismaInstrumentation).toHaveBeenCalled();
  });

  it('should use 10% sample rate in production', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    process.env.NODE_ENV = 'production';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-node');

    await import('./telemetry');

    expect(TraceIdRatioBasedSampler).toHaveBeenCalledWith(0.1);
  });

  it('should use 100% sample rate in development', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    process.env.NODE_ENV = 'development';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-node');

    await import('./telemetry');

    expect(TraceIdRatioBasedSampler).toHaveBeenCalledWith(1.0);
  });

  it('should register SIGTERM handler for graceful shutdown', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

    const spy = jest.spyOn(process, 'on');

    await import('./telemetry');

    expect(spy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    spy.mockRestore();
  });

  it('should configure BatchSpanProcessor with production settings', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node');

    await import('./telemetry');

    expect(BatchSpanProcessor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        maxQueueSize: 2048,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
        maxExportBatchSize: 512,
      }),
    );
  });
});
