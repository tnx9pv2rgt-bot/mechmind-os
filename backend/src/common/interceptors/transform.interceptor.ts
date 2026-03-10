import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    page?: number;
    pages?: number;
  };
  timestamp: string;
  [key: string]: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map(data => {
        // If response already has standard format, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
          };
        }

        // Extract meta information if present
        const meta = data?.meta;
        const responseData = data?.data || data;

        return {
          success: true,
          data: responseData,
          ...(meta && { meta }),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
