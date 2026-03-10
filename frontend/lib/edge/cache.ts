/**
 * Edge Caching Utilities
 * 
 * Helper functions for implementing edge caching strategies
 * compatible with Vercel Edge Network and Cloudflare
 */

// Cache duration presets (in seconds)
export const CACHE_DURATION = {
  // No cache
  NONE: 0,
  // Very short - real-time data
  REALTIME: 5,
  // Short - frequently changing data
  SHORT: 60,
  // Medium - semi-static data
  MEDIUM: 300,
  // Long - static data
  LONG: 3600,
  // Very long - assets
  VERY_LONG: 86400,
  // Immutable - never changes
  IMMUTABLE: 31536000,
} as const

// Cache control directives
export const CACHE_DIRECTIVE = {
  // Private - browser only, no CDN
  PRIVATE: 'private',
  // Public - can be cached by CDN
  PUBLIC: 'public',
  // No store - never cache
  NO_STORE: 'no-store',
  // No cache - must revalidate
  NO_CACHE: 'no-cache',
  // Must revalidate
  MUST_REVALIDATE: 'must-revalidate',
  // Proxy revalidate
  PROXY_REVALIDATE: 'proxy-revalidate',
} as const

interface CacheConfig {
  duration: number
  staleWhileRevalidate?: number
  directive?: string
  vary?: string[]
  private?: boolean
  immutable?: boolean
}

/**
 * Generate Cache-Control header value
 */
export function generateCacheControl(config: CacheConfig): string {
  const {
    duration,
    staleWhileRevalidate,
    directive = CACHE_DIRECTIVE.PUBLIC,
    immutable = false,
  } = config

  const parts: string[] = [directive]

  if (immutable) {
    parts.push('max-age=31536000', 'immutable')
    return parts.join(', ')
  }

  if (duration > 0) {
    parts.push(`max-age=${duration}`)
  }

  if (staleWhileRevalidate && staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${staleWhileRevalidate}`)
  }

  if (config.private) {
    parts.push(CACHE_DIRECTIVE.PRIVATE)
  }

  return parts.join(', ')
}

/**
 * Generate Vary header value
 */
export function generateVary(headers: string[]): string {
  return headers.join(', ')
}

/**
 * Create edge caching headers for different scenarios
 */
export const edgeCacheHeaders = {
  // Static assets (JS, CSS, fonts)
  static: () => ({
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Vary': 'Accept-Encoding',
  }),

  // API responses with short cache
  apiShort: () => ({
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'Vary': 'Authorization, Accept-Language',
  }),

  // API responses with medium cache
  apiMedium: () => ({
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    'Vary': 'Accept-Language',
  }),

  // API responses with long cache
  apiLong: () => ({
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'Vary': 'Accept-Language',
  }),

  // Geolocation data
  geo: () => ({
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'Vary': 'Accept-Language, CF-IPCountry',
    'CDN-Cache-Control': 'max-age=3600',
    'Vercel-CDN-Cache-Control': 'max-age=3600',
  }),

  // HTML pages
  html: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  }),

  // Real-time data (no cache)
  realtime: () => ({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }),

  // User-specific data
  userSpecific: () => ({
    'Cache-Control': 'private, no-cache, max-age=0',
    'Vary': 'Authorization',
  }),
}

/**
 * Cache key generator for edge caching
 */
export function generateCacheKey(
  pathname: string,
  params: Record<string, string>,
  userId?: string
): string {
  const parts = [pathname]
  
  // Add sorted params
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  
  if (sortedParams) {
    parts.push(sortedParams)
  }
  
  // Add user segment if present
  if (userId) {
    parts.push(`u=${userId}`)
  }
  
  return parts.join('|')
}

/**
 * Parse cache control header
 */
export function parseCacheControl(header: string): Record<string, number | boolean> {
  const directives: Record<string, number | boolean> = {}
  
  header.split(',').forEach((part) => {
    const [key, value] = part.trim().split('=')
    
    if (value === undefined) {
      directives[key] = true
    } else {
      const numValue = parseInt(value, 10)
      directives[key] = isNaN(numValue) ? true : numValue
    }
  })
  
  return directives
}

/**
 * Check if response should be cached
 */
export function shouldCache(
  response: Response,
  request: Request
): boolean {
  // Don't cache non-GET/HEAD requests
  if (!['GET', 'HEAD'].includes(request.method)) {
    return false
  }
  
  // Don't cache non-success responses
  if (!response.ok) {
    return false
  }
  
  // Check cache-control header
  const cacheControl = response.headers.get('cache-control')
  if (cacheControl) {
    const directives = parseCacheControl(cacheControl)
    
    // Don't cache if no-store
    if (directives['no-store']) {
      return false
    }
    
    // Don't cache private responses unless explicitly allowed
    if (directives['private'] && !directives['s-maxage']) {
      return false
    }
  }
  
  // Don't cache Set-Cookie responses
  if (response.headers.has('set-cookie')) {
    return false
  }
  
  return true
}

/**
 * Calculate cache TTL based on response headers
 */
export function calculateCacheTTL(response: Response): number {
  const cacheControl = response.headers.get('cache-control')
  
  if (!cacheControl) {
    return 0
  }
  
  const directives = parseCacheControl(cacheControl)
  
  // Prefer s-maxage for CDN caching
  if (typeof directives['s-maxage'] === 'number') {
    return directives['s-maxage']
  }
  
  // Fall back to max-age
  if (typeof directives['max-age'] === 'number') {
    return directives['max-age']
  }
  
  return 0
}

export default {
  CACHE_DURATION,
  CACHE_DIRECTIVE,
  generateCacheControl,
  generateVary,
  edgeCacheHeaders,
  generateCacheKey,
  parseCacheControl,
  shouldCache,
  calculateCacheTTL,
}
