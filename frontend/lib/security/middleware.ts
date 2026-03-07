/**
 * Security Middleware - Integration with Next.js Middleware
 * Combines all security features into a unified middleware
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIP, isIPBlocked, RateLimitType } from './rateLimit'
import { detectBot } from './botDetection'
import { validateOrigin } from './csrf'
import { logSecurityEvent } from './audit'

export interface SecurityConfig {
  // Rate limiting
  rateLimiting?: {
    enabled: boolean
    type?: RateLimitType
    skipPaths?: string[]
  }
  
  // Bot detection
  botDetection?: {
    enabled: boolean
    blockThreshold?: number
    checkRecaptcha?: boolean
    skipPaths?: string[]
  }
  
  // CSRF
  csrf?: {
    enabled: boolean
    strictOrigin?: boolean
    skipPaths?: string[]
  }
  
  // IP blocking
  ipBlocking?: {
    enabled: boolean
  }
  
  // CORS
  cors?: {
    enabled: boolean
    allowedOrigins?: string[]
    allowedMethods?: string[]
    allowedHeaders?: string[]
    credentials?: boolean
  }
}

const DEFAULT_CONFIG: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    type: 'apiGeneral',
    skipPaths: ['/api/health', '/_next', '/static', '/favicon.ico'],
  },
  botDetection: {
    enabled: true,
    blockThreshold: 70,
    checkRecaptcha: false,
    skipPaths: ['/api/health', '/_next', '/static'],
  },
  csrf: {
    enabled: true,
    strictOrigin: true,
    skipPaths: ['/api/webhook', '/api/health'],
  },
  ipBlocking: {
    enabled: true,
  },
  cors: {
    enabled: true,
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
  },
}

/**
 * Apply security middleware to request
 */
export async function applySecurityMiddleware(
  request: NextRequest,
  config: SecurityConfig = DEFAULT_CONFIG
): Promise<NextResponse | null> {
  const url = request.nextUrl
  const pathname = url.pathname
  const method = request.method
  const ip = getClientIP(request as unknown as Request)
  
  // Create response with security headers
  const response = NextResponse.next()
  
  // 1. Check IP blocking first
  if (config.ipBlocking?.enabled) {
    const blocked = await isIPBlocked(ip)
    if (blocked) {
      await logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        ip,
        path: pathname,
        method,
        details: { reason: 'blocked_ip_attempt' },
      })
      
      return new NextResponse(
        JSON.stringify({ error: 'Access Denied', code: 'IP_BLOCKED' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
  
  // 2. Bot Detection
  if (config.botDetection?.enabled) {
    const shouldSkipBotCheck = config.botDetection.skipPaths?.some(path => 
      pathname.startsWith(path)
    )
    
    if (!shouldSkipBotCheck) {
      const botResult = await detectBot(request as unknown as Request, {
        checkRecaptcha: config.botDetection.checkRecaptcha,
      })
      
      // Add bot headers for monitoring
      response.headers.set('X-Bot-Score', botResult.score.toString())
      response.headers.set('X-Bot-Confidence', botResult.confidence)
      
      if (botResult.isBot) {
        await logSecurityEvent({
          type: 'bot_detected',
          severity: botResult.confidence === 'critical' ? 'critical' : 'high',
          ip,
          userAgent: request.headers.get('user-agent') || undefined,
          path: pathname,
          method,
          details: {
            score: botResult.score,
            confidence: botResult.confidence,
            reasons: botResult.reasons,
          },
        })
        
        // Challenge or block based on confidence
        if (botResult.confidence === 'critical') {
          return new NextResponse(
            JSON.stringify({
              error: 'Access Denied',
              message: 'Automated access detected',
              code: 'BOT_DETECTED',
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
    }
  }
  
  // 3. Rate Limiting
  if (config.rateLimiting?.enabled && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const shouldSkipRateLimit = config.rateLimiting.skipPaths?.some(path => 
      pathname.startsWith(path)
    )
    
    if (!shouldSkipRateLimit) {
      const rateLimitResult = await checkRateLimit(
        request as unknown as Request,
        config.rateLimiting.type || 'apiGeneral',
        ip
      )
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      
      if (!rateLimitResult.success) {
        await logSecurityEvent({
          type: 'rate_limited',
          severity: 'medium',
          ip,
          path: pathname,
          method,
          details: {
            limit: rateLimitResult.limit,
            retryAfter: rateLimitResult.retryAfter,
          },
        })
        
        return new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            },
          }
        )
      }
    }
  }
  
  // 4. CSRF / Origin Validation
  if (config.csrf?.enabled && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const shouldSkipCSRF = config.csrf.skipPaths?.some(path => 
      pathname.startsWith(path)
    )
    
    if (!shouldSkipCSRF && config.csrf.strictOrigin) {
      const originValid = validateOrigin(request as unknown as Request)
      if (!originValid) {
        await logSecurityEvent({
          type: 'csrf_failed',
          severity: 'high',
          ip,
          path: pathname,
          method,
          details: {
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer'),
          },
        })
        
        return new NextResponse(
          JSON.stringify({
            error: 'Invalid Origin',
            message: 'Request origin is not allowed',
            code: 'INVALID_ORIGIN',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  }
  
  // 5. CORS Headers
  if (config.cors?.enabled) {
    const origin = request.headers.get('origin')
    
    if (origin) {
      const allowedOrigins = config.cors.allowedOrigins || ['*']
      const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin)
      
      if (isAllowed) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Methods', 
          config.cors.allowedMethods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers',
          config.cors.allowedHeaders?.join(', ') || 'Content-Type, Authorization')
        
        if (config.cors.credentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true')
        }
      }
    }
    
    // Handle preflight
    if (method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
  }
  
  // Add security headers
  addSecurityHeaders(response)
  
  return response
}

/**
 * Add comprehensive security headers
 */
function addSecurityHeaders(response: NextResponse): void {
  // Prevent XSS
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Prevent content type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // HSTS
  response.headers.set('Strict-Transport-Security', 
    'max-age=31536000; includeSubDomains; preload')
  
  // Permissions policy
  response.headers.set('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()')
  
  // DNS prefetch
  response.headers.set('X-DNS-Prefetch-Control', 'on')
}

/**
 * Create a security middleware for Next.js
 * Usage in middleware.ts:
 * 
 * import { createSecurityMiddleware } from '@/lib/security/middleware'
 * 
 * export const middleware = createSecurityMiddleware({
 *   rateLimiting: { enabled: true, type: 'apiGeneral' },
 *   botDetection: { enabled: true, blockThreshold: 70 },
 * })
 * 
 * export const config = {
 *   matcher: ['/api/:path*', '/dashboard/:path*']
 * }
 */
export function createSecurityMiddleware(config?: SecurityConfig) {
  return async function securityMiddleware(request: NextRequest) {
    const result = await applySecurityMiddleware(request, config)
    return result || NextResponse.next()
  }
}
