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
        const loadTest = process.env.LOAD_TEST === 'true';
        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60000, // 1 minute
              limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600,
            },
            {
              name: 'strict',
              ttl: 60000,
              limit: loadTest ? 100000 : 10,
            },
            {
              name: 'lenient',
              ttl: 60000,
              limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000,
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
