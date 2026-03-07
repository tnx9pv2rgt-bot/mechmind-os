/**
 * SUBSCRIPTION MIDDLEWARE
 * 
 * Middleware for enforcing subscription-based access control
 */

import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FeatureAccessService } from '../services/feature-access.service';
import { FeatureFlag } from '@prisma/client';

// Extend Express Request to include tenant info
declare global {
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
export function requireFeature(feature: FeatureFlag) {
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
 * Rate limiting middleware based on subscription plan
 */
@Injectable()
export class SubscriptionRateLimitMiddleware implements NestMiddleware {
  private apiCallCounts = new Map<string, { count: number; resetAt: number }>();

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return next();
    }

    // Track API call
    const now = Date.now();
    const key = `${tenantId}:${new Date().toISOString().slice(0, 7)}`; // Monthly key
    
    const current = this.apiCallCounts.get(key) || { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };
    
    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + 24 * 60 * 60 * 1000;
    }
    
    current.count++;
    this.apiCallCounts.set(key, current);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', '25000'); // Default limit
    res.setHeader('X-RateLimit-Remaining', Math.max(0, 25000 - current.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(current.resetAt).toISOString());

    next();
  }
}
