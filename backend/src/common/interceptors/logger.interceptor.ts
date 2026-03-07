import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    const startTime = Date.now();

    // Log request (exclude sensitive data)
    const sanitizedBody = this.sanitizeBody(body);
    this.logger.log(
      `[REQUEST] ${method} ${url} - ${controller}.${handler}`,
      'LoggerInterceptor',
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `[RESPONSE] ${method} ${url} - ${duration}ms`,
            'LoggerInterceptor',
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[ERROR] ${method} ${url} - ${duration}ms - ${error.message}`,
            error.stack,
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
