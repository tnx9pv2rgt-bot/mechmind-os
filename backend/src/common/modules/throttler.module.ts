/**
 * MechMind OS - Rate Limiting Module
 *
 * Rate limiting with in-memory storage (compatible with all Redis providers)
 * Protects against DDoS and brute force attacks
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule as NestThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Get default throttler limit based on environment
 */
export function getDefaultLimit(): number {
  const loadTest = process.env.LOAD_TEST === 'true';
  if (loadTest) {
    return 100000;
  }
  if (process.env.NODE_ENV === 'production') {
    return 60;
  }
  return 600;
}

/**
 * Get strict throttler limit based on environment
 */
export function getStrictLimit(): number {
  const loadTest = process.env.LOAD_TEST === 'true';
  if (loadTest) {
    return 100000;
  }
  return 10;
}

/**
 * Get lenient throttler limit based on environment
 */
export function getLenientLimit(): number {
  const loadTest = process.env.LOAD_TEST === 'true';
  if (loadTest) {
    return 100000;
  }
  if (process.env.NODE_ENV === 'production') {
    return 300;
  }
  return 3000;
}

/**
 * Create throttler configuration based on environment variables.
 * Exported for testability - all branch logic measured by c8.
 */
export function createThrottlerOptions(
  _config?: ConfigService,
): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: 60000,
        limit: getDefaultLimit(),
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: getStrictLimit(),
      },
      {
        name: 'lenient',
        ttl: 60000,
        limit: getLenientLimit(),
      },
    ],
    errorMessage: 'Rate limit exceeded. Please try again later.',
  };
}

@Module({
  imports: [
    NestThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createThrottlerOptions,
    }),
  ],
  exports: [NestThrottlerModule],
})
export class RateLimitingModule {}
