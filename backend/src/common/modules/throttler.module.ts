/**
 * MechMind OS - Rate Limiting Module
 *
 * Rate limiting with in-memory storage (compatible with all Redis providers)
 * Protects against DDoS and brute force attacks
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule as NestThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';

@Module({
  imports: [
    NestThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_config: ConfigService): ThrottlerModuleOptions => {
        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60000, // 1 minute
              limit: 60, // 60 requests per minute
            },
            {
              name: 'strict',
              ttl: 60000,
              limit: 10, // 10 requests per minute (for sensitive endpoints)
            },
            {
              name: 'lenient',
              ttl: 60000,
              limit: 300, // 300 requests per minute (for high-traffic endpoints)
            },
          ],
          errorMessage: 'Rate limit exceeded. Please try again later.',
        };
      },
    }),
  ],
  exports: [NestThrottlerModule],
})
export class RateLimitingModule {}
