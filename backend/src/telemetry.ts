import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  AlwaysOnSampler,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const nodeEnv = process.env.NODE_ENV || 'development';

// Only initialize if explicitly enabled or endpoint is configured
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_ENABLED === 'true') {
  const sampleRate = nodeEnv === 'production' ? 0.1 : 1.0;

  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(sampleRate),
    // Always trace if parent was sampled
    remoteParentSampled: new AlwaysOnSampler(),
    localParentSampled: new AlwaysOnSampler(),
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${otelEndpoint}/v1/traces`,
  });

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'mechmind-backend',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '10.0.0',
      'deployment.environment': nodeEnv,
    }),
    sampler,
    spanProcessors: [
      new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 2048,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
        maxExportBatchSize: 512,
      }),
    ],
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy instrumentations
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();

  // eslint-disable-next-line no-console
  console.log(
    `[OpenTelemetry] Initialized — exporter: ${otelEndpoint}, sample rate: ${sampleRate * 100}%, env: ${nodeEnv}`,
  );

  process.on('SIGTERM', () => {
    void sdk.shutdown().then(() => {
      // eslint-disable-next-line no-console
      console.log('[OpenTelemetry] SDK shut down gracefully');
    });
  });
}
