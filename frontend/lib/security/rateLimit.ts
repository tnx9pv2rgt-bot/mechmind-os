/**
 * Rate Limiting Multi-Layer - Cloudflare-style
 * Distributed rate limiting using Upstash Redis
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Redis client initialization
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})

// Check if Redis is configured
const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Rate limiter configurations per endpoint type
export const rateLimiters = {
  // Form submissions: 5 per hour per IP
  formSubmit: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit/form-submit',
  }),
  
  // Email validation: 10 per minute
  emailValidation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/email-validation',
  }),
  
  // VAT verification: 10 per minute
  vatVerification: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/vat-verification',
  }),
  
  // IP geolocation: 100 per day
  geoLookup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 d'),
    analytics: true,
    prefix: '@upstash/ratelimit/geo-lookup',
  }),
  
  // API general requests: 100 per minute
  apiGeneral: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/api-general',
  }),
  
  // Authentication attempts: 5 per 15 minutes
  authAttempt: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/auth-attempt',
  }),
  
  // Password reset: 3 per hour
  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit/password-reset',
  }),
}

export type RateLimitType = keyof typeof rateLimiters

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Get client IP from request headers
 * Supports Cloudflare, Vercel, and standard headers
 */
export function getClientIP(request: Request): string {
  const headers = request.headers
  
  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP
  
  // Vercel
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for')
  if (vercelForwardedFor) return vercelForwardedFor.split(',')[0].trim()
  
  // Standard forwarded-for
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  
  // Real IP
  const realIP = headers.get('x-real-ip')
  if (realIP) return realIP
  
  // Fallback
  return '127.0.0.1'
}

/**
 * Check rate limit for a given request and type
 */
export async function checkRateLimit(
  request: Request,
  type: RateLimitType,
  identifier?: string
): Promise<RateLimitResult> {
  // Fallback if Redis is not configured
  if (!isRedisConfigured) {
    console.warn('[RateLimit] Redis not configured, allowing request')
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }
  }
  
  const ip = identifier || getClientIP(request)
  const limiter = rateLimiters[type]
  
  try {
    const result = await limiter.limit(ip)
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    }
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error)
    // Fail open - allow request on error
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }
  }
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function rateLimitMiddleware(
  request: Request,
  type: RateLimitType
): Promise<Response | null> {
  const result = await checkRateLimit(request, type)
  
  if (!result.success) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': result.reset.toString(),
    }
    
    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString()
    }
    
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers,
      }
    )
  }
  
  // Add rate limit headers to successful requests
  request.headers.set('X-RateLimit-Limit', result.limit.toString())
  request.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  
  return null // Continue processing
}

/**
 * Block an IP address for a specified duration
 */
export async function blockIP(
  ip: string,
  durationSeconds: number = 3600,
  reason: string = 'manual_block'
): Promise<void> {
  if (!isRedisConfigured) return
  
  const key = `security:blocked-ip:${ip}`
  await redis.setex(key, durationSeconds, JSON.stringify({
    blockedAt: Date.now(),
    reason,
    expiresAt: Date.now() + (durationSeconds * 1000),
  }))
}

/**
 * Check if an IP is blocked
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  if (!isRedisConfigured) return false
  
  const key = `security:blocked-ip:${ip}`
  const blocked = await redis.get(key)
  return blocked !== null
}

/**
 * Get blocked IP information
 */
export async function getBlockedIPInfo(ip: string): Promise<{
  blockedAt: number
  reason: string
  expiresAt: number
} | null> {
  if (!isRedisConfigured) return null
  
  const key = `security:blocked-ip:${ip}`
  const data = await redis.get<string>(key)
  
  if (!data) return null
  
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ip: string): Promise<void> {
  if (!isRedisConfigured) return
  
  const key = `security:blocked-ip:${ip}`
  await redis.del(key)
}

/**
 * Get rate limit analytics
 */
export async function getRateLimitAnalytics(
  type: RateLimitType,
  hours: number = 24
): Promise<{
  totalRequests: number
  blockedRequests: number
  uniqueIPs: number
}> {
  if (!isRedisConfigured) {
    return { totalRequests: 0, blockedRequests: 0, uniqueIPs: 0 }
  }
  
  const prefix = `@upstash/ratelimit/${type}`
  // This is a simplified analytics - in production you'd use a proper analytics service
  return { totalRequests: 0, blockedRequests: 0, uniqueIPs: 0 }
}
