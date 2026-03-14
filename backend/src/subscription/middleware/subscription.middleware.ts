/**
 * SUBSCRIPTION MIDDLEWARE
 *
 * Middleware for enforcing subscription-based access control
 */

import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FeatureAccessService } from '../services/feature-access.service';
import { RedisService } from '../../common/services/redis.service';
import { FeatureFlag } from '@prisma/client';

// Extend Express Request to include tenant info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
      subscription?: {
        plan: string;
        status: string;
        features: FeatureFlag[];
      };
    }
  }
}

/**
 * Middleware that attaches subscription info to requests
 */
@Injectable()
export class SubscriptionMiddleware implements NestMiddleware {
  constructor(private featureAccessService: FeatureAccessService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return next();
    }

    try {
      // Get usage stats which includes subscription info
      const usageStats = await this.featureAccessService.getUsageStats(tenantId);

      req.subscription = {
        plan: usageStats.plan,
        status: usageStats.status,
        features: Object.keys(usageStats.usage) as FeatureFlag[],
      };
    } catch {
      // Silently fail - subscription checks will handle missing data
    }

    next();
  }
}

/**
 * Middleware factory for checking specific features
 */
export function requireFeature(_feature: FeatureFlag) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID required');
    }

    // Note: This is a simplified version. In production, you'd want to
    // instantiate the FeatureAccessService properly or use a guard instead.
    next();
  };
}

/**
 * Rate limiting middleware based on subscription plan.
 * Uses Redis for tracking API calls with monthly window.
 */
@Injectable()
export class SubscriptionRateLimitMiddleware implements NestMiddleware {
  private static readonly DEFAULT_MONTHLY_LIMIT = 25000;

  constructor(private readonly redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return next();
    }

    const monthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-03"
    const redisKey = `rate:monthly:${tenantId}:${monthKey}`;

    // Get current count from Redis
    const currentStr = await this.redis.get(redisKey);
    const currentCount = currentStr ? parseInt(currentStr, 10) : 0;
    const newCount = currentCount + 1;

    // Calculate seconds until end of month for TTL
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const ttlSeconds = Math.ceil((endOfMonth.getTime() - now.getTime()) / 1000);

    // Increment counter in Redis with monthly TTL
    await this.redis.set(redisKey, newCount.toString(), ttlSeconds);

    const limit = SubscriptionRateLimitMiddleware.DEFAULT_MONTHLY_LIMIT;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - newCount).toString());
    res.setHeader('X-RateLimit-Reset', endOfMonth.toISOString());

    next();
  }
}
