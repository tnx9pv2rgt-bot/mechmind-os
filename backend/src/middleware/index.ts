/**
 * Middleware Module
 * Custom middleware exports
 */

// Rate Limiter
export {
  RedisRateLimiterMiddleware,
  ApplyRateLimit,
  createRateLimiter,
  checkRateLimit,
  type RateLimitConfig,
  type RateLimitInfo,
} from './redisRateLimiter';

// Auth Middleware
export {
  verifyToken,
  requireAuth,
  extractUser,
  requireRoles,
  requireTenant,
  requireAuthWithRole,
  verifyRefreshTokenMiddleware,
  tenantCorsMiddleware,
  auditLogMiddleware,
  authErrorHandler,
  extractTokenFromHeader,
  extractTokenFromCookie,
  type AuthMiddlewareOptions,
  type AuthError,
} from './auth';
