/**
 * Bot Detection - Cloudflare-style Multi-Layer Detection
 * Identifies and blocks automated traffic with confidence scoring
 */

import { Redis } from '@upstash/redis'
import { getClientIP } from './rateLimit'
import { logSecurityEvent } from './audit'

// Redis client for storing fingerprints
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})

const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

export interface BotCheckResult {
  isBot: boolean
  score: number // 0-100, >70 = likely bot
  confidence: 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
  fingerprint?: string
}

interface RequestFingerprint {
  userAgent: string
  acceptLanguage: string | null
  acceptEncoding: string | null
  acceptHeader: string | null
  dnt: string | null
  screenResolution?: string
  timezone?: string
  plugins?: string[]
  canvas?: string
  webgl?: string
  fonts?: string[]
}

// Known bot patterns (User-Agent strings)
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scrape/i,
  /headless/i, /puppeteer/i, /selenium/i,
  /phantom/i, /nightmare/i, /playwright/i,
  /curl/i, /wget/i, /python-requests/i,
  /postman/i, /insomnia/i, /httpclient/i,
  /scrapy/i, /mechanize/i, /casper/i,
  /slimer/i, /zombie/i, /electron/i,
]

// Known good browser patterns
const BROWSER_PATTERNS = [
  /chrome\/\d+/i, /firefox\/\d+/i, /safari\/\d+/i,
  /edge\/\d+/i, /opera\/\d+/i, /brave\/\d+/i,
]

// Suspicious header combinations
const SUSPICIOUS_HEADERS = [
  { missing: 'accept-language', score: 15 },
  { missing: 'accept-encoding', score: 10 },
  { missing: 'accept', score: 20 },
]

/**
 * Calculate bot score based on User-Agent analysis
 */
function analyzeUserAgent(ua: string): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  
  // Empty or generic UA
  if (!ua || ua.length < 20) {
    score += 30
    reasons.push('Empty or very short User-Agent')
    return { score, reasons }
  }
  
  // Check for known bot patterns
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) {
      score += 30
      reasons.push(`Bot pattern detected: ${pattern.source}`)
      break
    }
  }
  
  // Check for headless indicators
  if (/headlesschrome/i.test(ua)) {
    score += 40
    reasons.push('Headless Chrome detected')
  }
  
  if (/webkit.*presto/i.test(ua)) {
    score += 20
    reasons.push('Suspicious WebKit/Presto combination')
  }
  
  // Check for missing browser indicators
  const hasBrowserPattern = BROWSER_PATTERNS.some(p => p.test(ua))
  if (!hasBrowserPattern && ua.length > 0) {
    score += 15
    reasons.push('No recognized browser pattern')
  }
  
  // Check for automation frameworks
  const automationIndicators = [
    'selenium', 'webdriver', 'phantomjs', 'chromedriver',
    'msedgedriver', 'geckodriver', 'playwright'
  ]
  
  for (const indicator of automationIndicators) {
    if (ua.toLowerCase().includes(indicator)) {
      score += 35
      reasons.push(`Automation framework detected: ${indicator}`)
      break
    }
  }
  
  return { score, reasons }
}

/**
 * Analyze headers for bot indicators
 */
function analyzeHeaders(headers: Headers): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  
  // Check for missing standard headers
  for (const check of SUSPICIOUS_HEADERS) {
    if (!headers.get(check.missing)) {
      score += check.score
      reasons.push(`Missing ${check.missing} header`)
    }
  }
  
  // Check referer/origin
  const referer = headers.get('referer')
  const origin = headers.get('origin')
  if (!referer && !origin) {
    score += 10
    reasons.push('No referer/origin header')
  }
  
  // Check for suspicious header ordering (bots often have different ordering)
  const headerList = Array.from(headers.keys())
  const hasStandardOrder = headerList.some(h => 
    h.toLowerCase() === 'user-agent' ||
    h.toLowerCase() === 'accept'
  )
  
  if (!hasStandardOrder && headerList.length > 0) {
    score += 5
    reasons.push('Non-standard header ordering')
  }
  
  // Check for Cloudflare headers (if behind CF)
  const cfRay = headers.get('cf-ray')
  const cfIPCountry = headers.get('cf-ipcountry')
  
  // If we have CF headers but the request seems suspicious
  if (cfRay && score > 30) {
    reasons.push('Suspicious request behind Cloudflare')
  }
  
  return { score, reasons }
}

/**
 * Verify reCAPTCHA v3 token
 */
async function verifyRecaptcha(token: string): Promise<{
  success: boolean
  score: number
  action: string
  challengeTs: string
  hostname: string
}> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  
  if (!secretKey) {
    console.warn('[BotDetection] RECAPTCHA_SECRET_KEY not configured')
    return { success: true, score: 0.9, action: '', challengeTs: '', hostname: '' }
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    })
    
    const data = await response.json()
    return {
      success: data.success,
      score: data.score || 0,
      action: data.action || '',
      challengeTs: data.challenge_ts || '',
      hostname: data.hostname || '',
    }
  } catch (error) {
    console.error('[BotDetection] reCAPTCHA verification error:', error)
    return { success: false, score: 0, action: '', challengeTs: '', hostname: '' }
  }
}

/**
 * Check if fingerprint is known bot
 */
async function checkKnownBotFingerprint(fingerprint: string): Promise<{
  isKnown: boolean
  firstSeen: number
  count: number
}> {
  if (!isRedisConfigured) {
    return { isKnown: false, firstSeen: 0, count: 0 }
  }
  
  const key = `security:bot-fingerprint:${fingerprint}`
  const data = await redis.get<string>(key)
  
  if (!data) {
    return { isKnown: false, firstSeen: 0, count: 0 }
  }
  
  try {
    const parsed = JSON.parse(data)
    return {
      isKnown: true,
      firstSeen: parsed.firstSeen,
      count: parsed.count || 1,
    }
  } catch {
    return { isKnown: false, firstSeen: 0, count: 0 }
  }
}

/**
 * Store bot fingerprint
 */
async function storeBotFingerprint(fingerprint: string): Promise<void> {
  if (!isRedisConfigured) return
  
  const key = `security:bot-fingerprint:${fingerprint}`
  const existing = await redis.get<string>(key)
  
  if (existing) {
    try {
      const parsed = JSON.parse(existing)
      await redis.set(key, JSON.stringify({
        ...parsed,
        count: (parsed.count || 1) + 1,
        lastSeen: Date.now(),
      }), { ex: 86400 * 30 }) // 30 days TTL
    } catch {
      await redis.set(key, JSON.stringify({
        firstSeen: Date.now(),
        count: 1,
        lastSeen: Date.now(),
      }), { ex: 86400 * 30 })
    }
  } else {
    await redis.set(key, JSON.stringify({
      firstSeen: Date.now(),
      count: 1,
      lastSeen: Date.now(),
    }), { ex: 86400 * 30 })
  }
}

/**
 * Main bot detection function
 */
export async function detectBot(
  request: Request,
  options: {
    checkRecaptcha?: boolean
    recaptchaToken?: string
    body?: Record<string, any>
  } = {}
): Promise<BotCheckResult> {
  const reasons: string[] = []
  let score = 0
  
  const headers = request.headers
  const ua = headers.get('user-agent') || ''
  const ip = getClientIP(request)
  
  // Check 1: User Agent analysis
  const uaResult = analyzeUserAgent(ua)
  score += uaResult.score
  reasons.push(...uaResult.reasons)
  
  // Check 2: Header analysis
  const headerResult = analyzeHeaders(headers)
  score += headerResult.score
  reasons.push(...headerResult.reasons)
  
  // Check 3: Timing analysis (if form start time is provided)
  const formStartTime = headers.get('x-form-start-time') || options.body?.formStartTime
  if (formStartTime) {
    const timeSpent = Date.now() - parseInt(formStartTime as string, 10)
    if (timeSpent < 3000) { // Less than 3 seconds
      score += 25
      reasons.push(`Form completed too quickly (${timeSpent}ms)`)
    } else if (timeSpent > 3600000) { // More than 1 hour
      score += 10
      reasons.push('Form took unusually long to complete')
    }
  }
  
  // Check 4: Honeypot field detection
  const body = options.body || {}
  if (body.website || body.honeypot || body.url || body.website_url) {
    score += 50
    reasons.push('Honeypot field triggered')
  }
  
  // Check 5: reCAPTCHA v3 verification
  if (options.checkRecaptcha && options.recaptchaToken) {
    const recaptchaResult = await verifyRecaptcha(options.recaptchaToken)
    if (!recaptchaResult.success) {
      score += 40
      reasons.push('reCAPTCHA verification failed')
    } else if (recaptchaResult.score < 0.3) {
      score += 35
      reasons.push(`Very low reCAPTCHA score (${recaptchaResult.score})`)
    } else if (recaptchaResult.score < 0.5) {
      score += 20
      reasons.push(`Low reCAPTCHA score (${recaptchaResult.score})`)
    }
  }
  
  // Check 6: Browser fingerprint consistency
  const fingerprint = body?.browserFingerprint || generateFingerprint(request)
  if (fingerprint) {
    const knownBotCheck = await checkKnownBotFingerprint(fingerprint)
    if (knownBotCheck.isKnown && knownBotCheck.count > 5) {
      score += 30
      reasons.push(`Known bot fingerprint (${knownBotCheck.count} occurrences)`)
    }
    
    // Store fingerprint if bot detected
    if (score > 50) {
      await storeBotFingerprint(fingerprint)
    }
  }
  
  // Check 7: IP reputation (simplified - would integrate with threat intelligence)
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) {
    // Internal IPs might be testing
    score -= 10
  }
  
  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high' | 'critical'
  if (score >= 80) confidence = 'critical'
  else if (score >= 60) confidence = 'high'
  else if (score >= 40) confidence = 'medium'
  else confidence = 'low'
  
  const result: BotCheckResult = {
    isBot: score > 70,
    score: Math.min(score, 100),
    confidence,
    reasons: [...new Set(reasons)], // Remove duplicates
    fingerprint,
  }
  
  // Log high-confidence bot detections
  if (result.isBot) {
    await logSecurityEvent({
      type: 'bot_detected',
      severity: confidence === 'critical' ? 'critical' : 'high',
      ip,
      userAgent: ua,
      details: {
        score: result.score,
        confidence: result.confidence,
        reasons: result.reasons,
        fingerprint: result.fingerprint,
        path: new URL(request.url).pathname,
      },
    })
  }
  
  return result
}

/**
 * Generate a simple fingerprint from request
 */
function generateFingerprint(request: Request): string {
  const headers = request.headers
  const components = [
    headers.get('user-agent') || '',
    headers.get('accept-language') || '',
    headers.get('accept-encoding') || '',
    headers.get('dnt') || '',
  ]
  
  // Simple hash (in production, use a proper hashing library)
  return btoa(components.join('|')).slice(0, 32)
}

/**
 * Middleware for bot detection
 */
export async function botDetectionMiddleware(
  request: Request,
  options: {
    blockThreshold?: number
    checkRecaptcha?: boolean
  } = {}
): Promise<Response | null> {
  const { blockThreshold = 70, checkRecaptcha = false } = options
  
  const result = await detectBot(request, { checkRecaptcha })
  
  if (result.score >= blockThreshold) {
    return new Response(
      JSON.stringify({
        error: 'Access Denied',
        message: 'Automated access detected. Please use a standard web browser.',
        code: 'BOT_DETECTED',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Score': result.score.toString(),
          'X-Bot-Confidence': result.confidence,
        },
      }
    )
  }
  
  // Add bot score headers for monitoring
  request.headers.set('X-Bot-Score', result.score.toString())
  request.headers.set('X-Bot-Confidence', result.confidence)
  
  return null // Continue processing
}

/**
 * Challenge suspicious requests with CAPTCHA
 */
export function createChallengeResponse(result: BotCheckResult): Response {
  return new Response(
    JSON.stringify({
      challenge: 'captcha_required',
      message: 'Please complete the security challenge to continue.',
      score: result.score,
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Score': result.score.toString(),
      },
    }
  )
}
