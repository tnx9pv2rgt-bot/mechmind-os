/**
 * MechMind OS - Advanced Rate Limiting Guard
 *
 * Custom ThrottlerGuard with:
 * - Redis storage for distributed rate limiting
 * - Different limits per endpoint/user role
 * - IP + User tracking
 * - Custom error messages
 */

import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class AdvancedThrottlerGuard extends NestThrottlerGuard {
  /**
   * Override to provide custom error response
   */
  protected throwThrottlingException(): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded. Please try again later.',
        error: 'Too Many Requests',
        retryAfter: 60, // seconds
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Get tracker identifier (IP + User ID if authenticated)
   */
  protected async getTracker(req: Request): Promise<string> {
    const ip = this.getClientIp(req);

    // If user is authenticated, include user ID for per-user limiting
    const userId = (req as Request & { user?: { sub?: string } }).user?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    return `ip:${ip}`;
  }

  /**
   * Get rate limit configuration based on context
   */
  protected async getThrottlerOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;
    const method = request.method;

    // Different limits for different endpoints
    const limits = this.getLimitsForPath(path, method);

    return {
      ttl: limits.ttl,
      limit: limits.limit,
    };
  }

  /**
   * Define rate limits per endpoint type
   */
  private getLimitsForPath(path: string, _method: string): { ttl: number; limit: number } {
    // Authentication endpoints - stricter limits
    if (path.includes('/auth/login') || path.includes('/auth/verify-2fa')) {
      return { ttl: 60, limit: 5 }; // 5 attempts per minute
    }

    // Password reset - very strict
    if (path.includes('/auth/reset-password') || path.includes('/auth/forgot-password')) {
      return { ttl: 3600, limit: 3 }; // 3 attempts per hour
    }

    // 2FA setup - moderate
    if (path.includes('/auth/2fa')) {
      return { ttl: 60, limit: 10 }; // 10 attempts per minute
    }

    // Webhooks - higher limits but still protected
    if (path.includes('/webhook')) {
      return { ttl: 60, limit: 100 }; // 100 requests per minute
    }

    // Voice API - higher limits
    if (path.includes('/voice')) {
      return { ttl: 60, limit: 200 }; // 200 requests per minute
    }

    // API endpoints - general limit
    if (path.startsWith('/api/v1/')) {
      return { ttl: 60, limit: 100 }; // 100 requests per minute
    }

    // GraphQL/WebSocket - higher limits
    if (path.includes('/graphql') || path.includes('/ws')) {
      return { ttl: 60, limit: 500 }; // 500 requests per minute
    }

    // Default limit
    return { ttl: 60, limit: 60 }; // 60 requests per minute
  }

  /**
   * Get client IP from request
   */
  private getClientIp(req: Request): string {
    // Check for X-Forwarded-For header (when behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    // Check for X-Real-IP header
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to connection remote address
    return req.ip || 'unknown';
  }
}
