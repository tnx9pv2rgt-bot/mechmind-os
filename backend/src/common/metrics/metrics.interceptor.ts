import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method } = request;
    const path = this.normalizePath(request.route?.path || request.url);
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          this.recordMetrics(method, path, response.statusCode, startTime);
        },
        error: (error: { status?: number }) => {
          const statusCode = error.status || 500;
          this.recordMetrics(method, path, statusCode, startTime);
        },
      }),
    );
  }

  private recordMetrics(method: string, path: string, statusCode: number, startTime: number): void {
    const duration = (Date.now() - startTime) / 1000;
    const labels = { method, path, status_code: String(statusCode) };

    this.metricsService.httpRequestsTotal.inc(labels);
    this.metricsService.httpRequestDuration.observe(labels, duration);
  }

  private normalizePath(path: string): string {
    // Replace UUIDs and numeric IDs with placeholders to avoid high cardinality
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id');
  }
}
