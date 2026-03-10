import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  constructor(private readonly configService?: ConfigService) {}

  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, context?: string): void {
    this.printMessage('log', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.printMessage('error', message, context);
    if (trace) {
      console.error(trace);
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

  private printMessage(
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    context?: string,
  ): void {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';
    const logFormat = this.configService?.get('LOG_FORMAT') || 'simple';

    if (logFormat === 'json') {
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        context: ctx,
        message,
      };
      console.log(JSON.stringify(logEntry));
    } else {
      const colorMap = {
        log: '\x1b[32m', // Green
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        debug: '\x1b[34m', // Blue
        verbose: '\x1b[35m', // Magenta
      };
      const resetColor = '\x1b[0m';
      const color = colorMap[level];

      console.log(`${color}[${level.toUpperCase()}]${resetColor} ${timestamp} [${ctx}] ${message}`);
    }
  }
}
