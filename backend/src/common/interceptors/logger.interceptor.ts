import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly isProduction: boolean;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    const startTime = Date.now();

    this.logger.log(`[REQUEST] ${method} ${url} - ${controller}.${handler}`, 'LoggerInterceptor');

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(`[RESPONSE] ${method} ${url} - ${duration}ms`, 'LoggerInterceptor');
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          // In production, do not log stack traces to avoid leaking internal details
          const errorDetail = this.isProduction
            ? error.message
            : `${error.message}\n${error.stack}`;
          this.logger.error(
            `[ERROR] ${method} ${url} - ${duration}ms - ${errorDetail}`,
            undefined,
            'LoggerInterceptor',
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
