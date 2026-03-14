/**
 * Rate Limiting Multi-Layer
 * In-memory sliding window rate limiting.
 * Primary rate limiting is enforced server-side by NestJS AdvancedThrottlerGuard.
 * This module provides an additional layer for Next.js API routes.
 */

// In-memory sliding window store
const windowStore = new Map<string, { timestamps: number[] }>();

// Rate limiter configurations per endpoint type
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  formSubmit: { maxRequests: 5, windowMs: 3600000 }, // 5 per hour
  emailValidation: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  vatVerification: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  geoLookup: { maxRequests: 100, windowMs: 86400000 }, // 100 per day
  apiGeneral: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
  authAttempt: { maxRequests: 5, windowMs: 900000 }, // 5 per 15 minutes
  passwordReset: { maxRequests: 3, windowMs: 3600000 }, // 3 per hour
};

export type RateLimitType = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Get client IP from request headers
 * Supports Cloudflare, Vercel, and standard headers
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;

  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;

  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) return vercelForwardedFor.split(',')[0].trim();

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP;

  return '127.0.0.1';
}

/**
 * Clean expired entries from the window store (runs periodically)
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of windowStore.entries()) {
    const maxWindow = 86400000; // 24h max window
    entry.timestamps = entry.timestamps.filter(ts => now - ts < maxWindow);
    if (entry.timestamps.length === 0) {
      windowStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpiredEntries, 300000);
}

/**
 * Check rate limit for a given request and type
 */
export async function checkRateLimit(
  request: Request,
  type: RateLimitType,
  identifier?: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type];
  if (!config) {
    return { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 };
  }

  const ip = identifier || getClientIP(request);
  const key = `${type}:${ip}`;
  const now = Date.now();

  let entry = windowStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    windowStore.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(ts => now - ts < config.windowMs);

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
  const reset =
    entry.timestamps.length > 0 ? entry.timestamps[0] + config.windowMs : now + config.windowMs;

  if (entry.timestamps.length >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset,
      retryAfter: Math.ceil((reset - now) / 1000),
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: remaining - 1,
    reset,
  };
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function rateLimitMiddleware(
  request: Request,
  type: RateLimitType
): Promise<Response | null> {
  const result = await checkRateLimit(request, type);

  if (!result.success) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': result.reset.toString(),
    };

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      }),
      { status: 429, headers }
    );
  }

  return null; // Continue processing
}

// In-memory IP block store
const blockedIPs = new Map<string, { blockedAt: number; reason: string; expiresAt: number }>();

/**
 * Block an IP address for a specified duration
 */
export async function blockIP(
  ip: string,
  durationSeconds: number = 3600,
  reason: string = 'manual_block'
): Promise<void> {
  blockedIPs.set(`security:blocked-ip:${ip}`, {
    blockedAt: Date.now(),
    reason,
    expiresAt: Date.now() + durationSeconds * 1000,
  });
}

/**
 * Check if an IP is blocked
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  const key = `security:blocked-ip:${ip}`;
  const entry = blockedIPs.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    blockedIPs.delete(key);
    return false;
  }
  return true;
}

/**
 * Get blocked IP information
 */
export async function getBlockedIPInfo(ip: string): Promise<{
  blockedAt: number;
  reason: string;
  expiresAt: number;
} | null> {
  const key = `security:blocked-ip:${ip}`;
  const entry = blockedIPs.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    blockedIPs.delete(key);
    return null;
  }
  return entry;
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ip: string): Promise<void> {
  blockedIPs.delete(`security:blocked-ip:${ip}`);
}

/**
 * Get rate limit analytics (in-memory approximation)
 */
export async function getRateLimitAnalytics(
  type: RateLimitType,
  _hours: number = 24
): Promise<{
  totalRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
}> {
  let totalRequests = 0;
  const uniqueIPs = new Set<string>();

  for (const [key, entry] of windowStore.entries()) {
    if (key.startsWith(`${type}:`)) {
      totalRequests += entry.timestamps.length;
      uniqueIPs.add(key.replace(`${type}:`, ''));
    }
  }

  return { totalRequests, blockedRequests: 0, uniqueIPs: uniqueIPs.size };
}
