import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../services/redis.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly TTL_SECONDS = 86400; // 24h

  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

    if (!idempotencyKey || !['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return next.handle();
    }

    const cacheKey = `idempotency:${idempotencyKey}`;

    if (this.redis.isAvailable) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return of(JSON.parse(cached));
      }
    }

    return next.handle().pipe(
      tap(async response => {
        if (this.redis.isAvailable) {
          await this.redis.set(cacheKey, JSON.stringify(response), this.TTL_SECONDS);
        }
      }),
    );
  }
}
