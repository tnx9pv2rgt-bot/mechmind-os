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

    // Guard 1: Check idempotency key exists
    const hasIdempotencyKey = !!idempotencyKey;
    if (!hasIdempotencyKey) {
      return next.handle();
    }

    // Guard 2: Check method is mutative
    const isMutativeMethod = ['POST', 'PUT', 'PATCH'].includes(request.method);
    if (!isMutativeMethod) {
      return next.handle();
    }

    // All guards passed - proceed with caching logic
    const cacheKey = `idempotency:${idempotencyKey}`;

    // Check Redis availability before attempting cache hit
    if (!this.redis.isAvailable) {
      return next.handle().pipe(
        tap(async response => {
          // Skip caching if Redis unavailable
        }),
      );
    }

    // Redis is available - try cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      // Cache hit - return immediately without calling next handler
      return of(JSON.parse(cached));
    }

    // Cache miss - call handler and cache result
    return next.handle().pipe(
      tap(async response => {
        if (this.redis.isAvailable) {
          await this.redis.set(cacheKey, JSON.stringify(response), this.TTL_SECONDS);
        }
      }),
    );
  }
}
