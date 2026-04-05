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

    // Extract context from request
    const correlationId = request.headers['x-correlation-id'] as string | undefined;
    const tenantId = request.user?.tenantId as string | undefined;
    const userId = request.user?.userId as string | undefined;

    // Set structured context for JSON logs
    this.logger.setStructuredContext({
      requestId: correlationId,
      tenantId,
      userId,
      method,
      url,
    });

    this.logger.log(`[REQUEST] ${method} ${url} - ${controller}.${handler}`, 'LoggerInterceptor');

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          this.logger.setStructuredContext({
            durationMs: duration,
            statusCode: response.statusCode,
          });
          this.logger.log(`[RESPONSE] ${method} ${url} - ${duration}ms`, 'LoggerInterceptor');
        },
        error: (error: Error & { status?: number }) => {
          const duration = Date.now() - startTime;
          this.logger.setStructuredContext({
            durationMs: duration,
            statusCode: error.status || 500,
          });
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
}
