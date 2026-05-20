import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace, context as otelContext } from '@opentelemetry/api';

export interface StructuredLogContext {
  traceId?: string;
  spanId?: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  durationMs?: number;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;
  private structuredCtx: StructuredLogContext = {};

  constructor(private readonly configService?: ConfigService) {}

  setContext(context: string): void {
    this.context = context;
  }

  setStructuredContext(ctx: StructuredLogContext): void {
    this.structuredCtx = { ...this.structuredCtx, ...ctx };
  }

  log(message: string, context?: string): void {
    this.printMessage('log', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.printMessage('error', message, context);
    if (trace) {
      this.printMessage('error', trace, context);
    }
  }

  warn(message: string, context?: string): void {
    this.printMessage('warn', message, context);
  }

  debug(message: string, context?: string): void {
    const logLevel = this.configService?.get('LOG_LEVEL') || 'info';
    if (logLevel === 'debug') {
      this.printMessage('debug', message, context);
    }
  }

  verbose(message: string, context?: string): void {
    const logLevel = this.configService?.get('LOG_LEVEL') || 'info';
    if (logLevel === 'verbose' || logLevel === 'debug') {
      this.printMessage('verbose', message, context);
    }
  }

  logWithCorrelation(message: string, correlationId?: string, context?: string): void {
    this.printMessage('log', message, context, correlationId);
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private printMessage(
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    context?: string,
    correlationId?: string,
  ): void {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';
    const logFormat = this.configService?.get('LOG_FORMAT') || 'simple';

    if (logFormat === 'json') {
      // Auto-inject traceId/spanId from OpenTelemetry context
      const activeSpan = trace.getSpan(otelContext.active());
      const spanContext = activeSpan?.spanContext();
      const otelTraceId = spanContext?.traceId;
      const otelSpanId = spanContext?.spanId;

      const logEntry: Record<string, unknown> = {
        timestamp,
        level: level.toUpperCase(),
        service: 'mechmind-backend',
        context: ctx,
        message,
      };

      // Add structured context fields — OTel context takes precedence
      if (correlationId || this.structuredCtx.requestId) {
        logEntry.requestId = correlationId || this.structuredCtx.requestId;
      }
      logEntry.traceId = otelTraceId || this.structuredCtx.traceId;
      logEntry.spanId = otelSpanId || this.structuredCtx.spanId;
      if (this.structuredCtx.tenantId) logEntry.tenantId = this.structuredCtx.tenantId;
      if (this.structuredCtx.userId) logEntry.userId = this.structuredCtx.userId;
      if (this.structuredCtx.method) logEntry.method = this.structuredCtx.method;
      if (this.structuredCtx.url) logEntry.url = this.structuredCtx.url;
      if (this.structuredCtx.statusCode) logEntry.statusCode = this.structuredCtx.statusCode;
      if (this.structuredCtx.durationMs !== undefined)
        logEntry.duration_ms = this.structuredCtx.durationMs;

      process.stdout.write(JSON.stringify(logEntry) + '\n');
    } else {
      const colorMap = {
        log: '\x1b[32m', // Green
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        debug: '\x1b[34m', // Blue
        verbose: '\x1b[35m', // Magenta
      };
      const resetColor = '\x1b[0m';
      // eslint-disable-next-line security/detect-object-injection
      const color = colorMap[level];

      const activeSpanSimple = trace.getSpan(otelContext.active());
      const traceIdSimple = activeSpanSimple?.spanContext().traceId;
      const traceStr = traceIdSimple ? ` [trace:${traceIdSimple.slice(0, 8)}]` : '';
      process.stdout.write(
        `${color}[${level.toUpperCase()}]${resetColor} ${timestamp} [${ctx}]${traceStr} ${message}\n`,
      );
    }
  }
}
