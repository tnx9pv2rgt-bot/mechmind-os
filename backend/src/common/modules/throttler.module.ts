/**
 * MechMind OS - Rate Limiting Module
 * 
 * Distributed rate limiting with Redis storage
 * Protects against DDoS and brute force attacks
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule as NestThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';

@Module({
  imports: [
    NestThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        const redisHost = config.get<string>('REDIS_HOST', 'localhost');
        const redisPort = config.get<number>('REDIS_PORT', 6379);
        const redisPassword = config.get<string>('REDIS_PASSWORD');
        const redisTls = config.get<string>('REDIS_TLS') === 'true';
        
        // Create Redis client for throttler storage
        const redisOptions: any = {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          db: config.get<number>('REDIS_THROTTLE_DB', 1), // Separate DB for rate limiting
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
        };
        
        if (redisTls) {
          redisOptions.tls = {};
        }
        
        const redisClient = new Redis(redisOptions);
        
        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60000, // 1 minute
              limit: 60,  // 60 requests per minute
            },
            {
              name: 'strict',
              ttl: 60000,
              limit: 10,  // 10 requests per minute (for sensitive endpoints)
            },
            {
              name: 'lenient',
              ttl: 60000,
              limit: 300, // 300 requests per minute (for high-traffic endpoints)
            },
          ],
          storage: new ThrottlerStorageRedisService(redisClient),
          errorMessage: 'Rate limit exceeded. Please try again later.',
        };
      },
    }),
  ],
  exports: [NestThrottlerModule],
})
export class RateLimitingModule {}
