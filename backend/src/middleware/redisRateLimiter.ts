/**
 * Redis Rate Limiter Middleware
 * Rate limiting distribuito usando Redis per multi-instance deployments
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

interface RateLimitStore {
  increment(key: string): Promise<RateLimitInfo>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
}

/**
 * Redis-backed store for distributed rate limiting
 */
class RedisRateLimitStore implements RateLimitStore {
  private readonly redis: Redis;
  private readonly windowMs: number;

  constructor(redis: Redis, windowMs: number) {
    this.redis = redis;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const multi = this.redis.multi();
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);
    
    // Count current requests
    multi.zcard(key);
    
    // Set expiry on the key
    multi.pexpire(key, this.windowMs);

    const results = await multi.exec();
    const current = results?.[2]?.[1] as number || 1;

    return {
      limit: 0, // Will be set by middleware
      current,
      remaining: Math.max(0, 0 - current), // Will be calculated by middleware
      resetTime: new Date(now + this.windowMs),
    };
  }

  async decrement(key: string): Promise<void> {
    const now = Date.now();
    // Remove most recent entry
    const entries = await this.redis.zrevrange(key, 0, 0);
    if (entries.length > 0) {
      await this.redis.zrem(key, entries[0]);
    }
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Sliding window log implementation for precise rate limiting
   */
  async incrementSlidingWindow(key: string, limit: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Lua script for atomic operation
    const script = `
      redis.call('zremrangebyscore', KEYS[1], 0, ARGV[1])
      local current = redis.call('zcard', KEYS[1])
      if current < tonumber(ARGV[2]) then
        redis.call('zadd', KEYS[1], ARGV[3], ARGV[4])
        redis.call('pexpire', KEYS[1], ARGV[5])
        return {current + 1, ARGV[5]}
      else
        local oldest = redis.call('zrange', KEYS[1], 0, 0, 'WITHSCORES')
        local retryAfter = oldest[2] - ARGV[1]
        return {current, retryAfter}
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      key,
      windowStart,
      limit,
      now,
      `${now}-${Math.random()}`,
      this.windowMs
    ) as [number, number];

    const current = result[0];
    const retryAfter = result[1];

    return {
      limit,
      current,
      remaining: Math.max(0, limit - current),
      resetTime: new Date(now + (retryAfter > 0 ? retryAfter : this.windowMs)),
    };
  }
}

/**
 * Fixed window counter implementation (more performant, less precise)
 */
class FixedWindowStore implements RateLimitStore {
  private readonly redis: Redis;
  private readonly windowMs: number;

  constructor(redis: Redis, windowMs: number) {
    this.redis = redis;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const multi = this.redis.multi();
    
    multi.incr(key);
    multi.pexpire(key, this.windowMs);
    
    const results = await multi.exec();
    const current = results?.[0]?.[1] as number || 1;
    const ttl = await this.redis.pttl(key);

    return {
      limit: 0,
      current,
      remaining: 0,
      resetTime: new Date(Date.now() + Math.max(0, ttl)),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(key);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

/**
 * Main Rate Limiter Middleware
 */
@Injectable()
export class RedisRateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RedisRateLimiterMiddleware.name);
  private readonly redis: Redis;
  private readonly configs: Map<string, RateLimitConfig> = new Map();

  // Predefined configurations
  public static readonly REGISTRATION_LIMIT: RateLimitConfig = {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    keyPrefix: 'ratelimit:registration',
  };

  public static readonly VAT_VERIFICATION_LIMIT: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'ratelimit:vat',
  };

  public static readonly EMAIL_CHECK_LIMIT: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'ratelimit:email',
  };

  public static readonly PHONE_CHECK_LIMIT: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'ratelimit:phone',
  };

  public static readonly LOGIN_LIMIT: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyPrefix: 'ratelimit:login',
  };

  public static readonly API_GENERAL_LIMIT: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'ratelimit:api',
  };

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: parseInt(this.configService.get('REDIS_DB') || '0'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableOfflineQueue: false,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err.message);
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Default: API general limit
    const config = RedisRateLimiterMiddleware.API_GENERAL_LIMIT;
    this.applyRateLimit(req, res, next, config);
  }

  /**
   * Create middleware with specific config
   */
  createMiddleware(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      this.applyRateLimit(req, res, next, config);
    };
  }

  private async applyRateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
    config: RateLimitConfig
  ): Promise<void> {
    const key = this.generateKey(req, config);
    const store = new RedisRateLimitStore(this.redis, config.windowMs);

    try {
      // Use sliding window for more accurate limiting
      const info = await store.incrementSlidingWindow(key, config.maxRequests);

      // Set headers
      res.setHeader('X-RateLimit-Limit', info.limit.toString());
      res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
      res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());

      if (info.current > info.limit) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        if (config.handler) {
          config.handler(req, res);
        } else {
          res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            retryAfter,
          });
        }
        return;
      }

      // Track for skip options
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        this.handleResponse(req, res, body, store, key, config);
        return originalJson(body);
      };

      next();
    } catch (error) {
      this.logger.error('Rate limiter error:', error.message);
      // Fail open - allow request if Redis is down
      next();
    }
  }

  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return `${config.keyPrefix}:${config.keyGenerator(req)}`;
    }

    // Default: IP-based limiting
    const identifier = this.getClientIp(req);
    return `${config.keyPrefix}:${identifier}`;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
      : req.socket?.remoteAddress;
    return ip || 'unknown';
  }

  private async handleResponse(
    req: Request,
    res: Response,
    body: any,
    store: RateLimitStore,
    key: string,
    config: RateLimitConfig
  ): Promise<void> {
    const statusCode = res.statusCode;
    const isSuccess = statusCode < 400;

    if (config.skipSuccessfulRequests && isSuccess) {
      await store.decrement(key);
    }

    if (config.skipFailedRequests && !isSuccess) {
      await store.decrement(key);
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(key: string, prefix?: string): Promise<void> {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    await this.redis.del(fullKey);
  }

  /**
   * Get current rate limit status for a key
   */
  async getLimitStatus(key: string, config: RateLimitConfig): Promise<RateLimitInfo | null> {
    const fullKey = `${config.keyPrefix}:${key}`;
    const store = new RedisRateLimitStore(this.redis, config.windowMs);
    
    try {
      const count = await this.redis.zcount(fullKey, Date.now() - config.windowMs, Date.now());
      const ttl = await this.redis.pttl(fullKey);
      
      return {
        limit: config.maxRequests,
        current: count,
        remaining: Math.max(0, config.maxRequests - count),
        resetTime: new Date(Date.now() + Math.max(0, ttl)),
      };
    } catch (error) {
      this.logger.error('Get limit status error:', error.message);
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Decorator for applying rate limits to controllers/methods
 */
export function ApplyRateLimit(config: RateLimitConfig | string): MethodDecorator & ClassDecorator {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    const limiterConfig = typeof config === 'string' 
      ? getPresetConfig(config)
      : config;

    Reflect.defineMetadata('RATE_LIMIT_CONFIG', limiterConfig, target, propertyKey || '');
    
    return descriptor || target;
  } as MethodDecorator & ClassDecorator;
}

function getPresetConfig(name: string): RateLimitConfig {
  const presets: Record<string, RateLimitConfig> = {
    'registration': RedisRateLimiterMiddleware.REGISTRATION_LIMIT,
    'vat': RedisRateLimiterMiddleware.VAT_VERIFICATION_LIMIT,
    'email': RedisRateLimiterMiddleware.EMAIL_CHECK_LIMIT,
    'phone': RedisRateLimiterMiddleware.PHONE_CHECK_LIMIT,
    'login': RedisRateLimiterMiddleware.LOGIN_LIMIT,
    'api': RedisRateLimiterMiddleware.API_GENERAL_LIMIT,
  };

  return presets[name] || RedisRateLimiterMiddleware.API_GENERAL_LIMIT;
}

/**
 * Factory function for Express middleware
 */
export function createRateLimiter(
  redisUrl: string,
  config: RateLimitConfig
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const redis = new Redis(redisUrl);
  const logger = new Logger('RateLimiter');
  const store = new RedisRateLimitStore(redis, config.windowMs);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const keyGenerator = config.keyGenerator || ((req: Request) => {
      return req.ip || req.socket?.remoteAddress || 'unknown';
    });

    const key = `${config.keyPrefix || 'ratelimit'}:${keyGenerator(req)}`;

    try {
      const info = await store.incrementSlidingWindow(key, config.maxRequests);

      res.setHeader('X-RateLimit-Limit', info.limit.toString());
      res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
      res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());

      if (info.current > info.limit) {
        const retryAfter = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error.message);
      next();
    }
  };
}

// Standalone rate limit check
export async function checkRateLimit(
  redisUrl: string,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; info: RateLimitInfo }> {
  const redis = new Redis(redisUrl);
  const store = new RedisRateLimitStore(redis, config.windowMs);

  try {
    const fullKey = `${config.keyPrefix}:${key}`;
    const info = await store.incrementSlidingWindow(fullKey, config.maxRequests);
    
    return {
      allowed: info.current <= info.limit,
      info,
    };
  } finally {
    await redis.quit();
  }
}
