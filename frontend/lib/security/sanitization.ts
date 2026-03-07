/**
 * Input Sanitization & Validation
 * XSS Prevention, SQL Injection Detection, and Input Cleaning
 */

import DOMPurify from 'isomorphic-dompurify'

// DOMPurify configuration for different use cases
const PURIFY_CONFIGS = {
  // Strict: No HTML allowed (for text inputs)
  strict: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  
  // Relaxed: Allow some formatting (for rich text)
  relaxed: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  },
  
  // Links only: Only allow anchor tags
  linksOnly: {
    ALLOWED_TAGS: ['a'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title'],
    ALLOW_DATA_ATTR: false,
  },
}

// SQL Injection patterns
const SQL_INJECTION_PATTERNS = [
  // Classic SQL injection
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  
  // UNION-based
  /((\%27)|(\'))union/i,
  /UNION\s+SELECT/i,
  /UNION\s+ALL\s+SELECT/i,
  
  // Error-based
  /AND\s+\d+=\d+/i,
  /OR\s+\d+=\d+/i,
  /AND\s+'[^']*'=\s*'[^']*'/i,
  /OR\s+'[^']*'=\s*'[^']*'/i,
  
  // Time-based blind
  /;\s*WAITFOR\s+DELAY/i,
  /;\s*SLEEP\s*\(\s*\d+\s*\)/i,
  /BENCHMARK\s*\(\s*\d+/i,
  
  // Stacked queries
  /;\s*DROP\s+TABLE/i,
  /;\s*DELETE\s+FROM/i,
  /;\s*INSERT\s+INTO/i,
  /;\s*UPDATE\s+\w+\s+SET/i,
  
  // Comments
  /\/\*[\s\S]*?\*\//,
  /--[^\n]*$/m,
  
  // Stored procedures
  /exec\s*\(\s*@/i,
  /exec\s+\(/i,
  /sp_executesql/i,
  /sp_password/i,
  /xp_cmdshell/i,
  
  // Char encoding bypasses
  /CHR\s*\(\s*\d+\s*\)/i,
  /CHAR\s*\(\s*\d+\s*\)/i,
  
  // Boolean-based blind
  /'\s*OR\s*'\d+'=\s*'\d+'/i,
  /'\s*AND\s*'\d+'=\s*'\d+'/i,
  
  // Common table expressions
  /WITH\s+\w+\s*AS\s*\(/i,
]

// NoSQL Injection patterns
const NOSQL_INJECTION_PATTERNS = [
  /\$where\s*:/i,
  /\$regex\s*:/i,
  /\$gt\s*:/i,
  /\$gte\s*:/i,
  /\$lt\s*:/i,
  /\$lte\s*:/i,
  /\$ne\s*:/i,
  /\$nin\s*:/i,
  /\$in\s*:\s*\[\s*\$\w+/i,
  /\{\s*\$\w+\s*:/,
]

// XSS patterns (additional to DOMPurify)
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /data:/i,
  /vbscript:/i,
  /mocha:/i,
  /livescript:/i,
  /expression\s*\(/i,
  /eval\s*\(/i,
  /Function\s*\(/i,
  /setTimeout\s*\(/i,
  /setInterval\s*\(/i,
]

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%252e%252e%252f/i,
  /%c0%ae%c0%ae%c0%af/i,
  /\.\.\/\.\.\//,
  /\.\.\\\.\.\\/,
  /etc\/passwd/,
  /windows\/system32/i,
  /boot\.ini/i,
  /win\.ini/i,
]

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /;\s*\w+/,
  /\|\s*\w+/,
  /`[^`]*`/,
  /\$\([^)]*\)/,
  /&&\s*\w+/,
  /\|\|\s*\w+/,
  />\s*\w+/,
  /<\s*\w+/,
  /\$\{\w+\}/,
  /%\w+%/,
]

export interface SanitizationResult {
  clean: string
  wasSanitized: boolean
  threatsDetected: string[]
}

export interface ValidationResult {
  isValid: boolean
  threats: string[]
}

/**
 * Sanitize HTML input
 */
export function sanitizeHTML(
  input: string,
  config: 'strict' | 'relaxed' | 'linksOnly' = 'strict'
): SanitizationResult {
  if (!input) {
    return { clean: '', wasSanitized: false, threatsDetected: [] }
  }
  
  const threats: string[] = []
  const original = input
  
  // Check for XSS attempts before sanitization
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('XSS attempt detected')
      break
    }
  }
  
  // Apply DOMPurify
  let clean = DOMPurify.sanitize(input, PURIFY_CONFIGS[config])
  
  // Additional post-processing for strict mode
  if (config === 'strict') {
    // Remove any remaining HTML entities that might be dangerous
    clean = clean
      .replace(/&lt;script&gt;/gi, '')
      .replace(/&lt;\/script&gt;/gi, '')
      .replace(/&#x3C;script&#x3E;/gi, '')
      .replace(/&#60;script&#62;/gi, '')
  }
  
  return {
    clean: clean.trim(),
    wasSanitized: clean !== original,
    threatsDetected: threats,
  }
}

/**
 * Detect SQL Injection attempts
 */
export function detectSQLInjection(input: string | object): ValidationResult {
  const threats: string[] = []
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input)
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(inputStr)) {
      threats.push(`SQL Injection pattern: ${pattern.source.slice(0, 50)}`)
    }
  }
  
  return {
    isValid: threats.length === 0,
    threats,
  }
}

/**
 * Detect NoSQL Injection attempts
 */
export function detectNoSQLInjection(input: string | object): ValidationResult {
  const threats: string[] = []
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input)
  
  for (const pattern of NOSQL_INJECTION_PATTERNS) {
    if (pattern.test(inputStr)) {
      threats.push(`NoSQL Injection pattern detected`)
      break
    }
  }
  
  return {
    isValid: threats.length === 0,
    threats,
  }
}

/**
 * Detect XSS attempts
 */
export function detectXSS(input: string): ValidationResult {
  const threats: string[] = []
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(`XSS pattern: ${pattern.source.slice(0, 50)}`)
    }
  }
  
  return {
    isValid: threats.length === 0,
    threats,
  }
}

/**
 * Detect Path Traversal attempts
 */
export function detectPathTraversal(input: string): ValidationResult {
  const threats: string[] = []
  
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(`Path traversal pattern: ${pattern.source}`)
    }
  }
  
  return {
    isValid: threats.length === 0,
    threats,
  }
}

/**
 * Detect Command Injection attempts
 */
export function detectCommandInjection(input: string): ValidationResult {
  const threats: string[] = []
  
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(`Command injection pattern: ${pattern.source}`)
    }
  }
  
  return {
    isValid: threats.length === 0,
    threats,
  }
}

/**
 * Comprehensive security check
 */
export function securityCheck(input: string | object): ValidationResult {
  const allThreats: string[] = []
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input)
  
  // Run all checks
  const checks = [
    detectSQLInjection(input),
    detectNoSQLInjection(input),
    detectXSS(inputStr),
    detectPathTraversal(inputStr),
    detectCommandInjection(inputStr),
  ]
  
  for (const check of checks) {
    allThreats.push(...check.threats)
  }
  
  return {
    isValid: allThreats.length === 0,
    threats: [...new Set(allThreats)],
  }
}

/**
 * Sanitize input for safe use
 */
export function sanitizeInput(
  input: string,
  options: {
    allowHTML?: boolean
    maxLength?: number
    trim?: boolean
    normalizeWhitespace?: boolean
  } = {}
): string {
  const {
    allowHTML = false,
    maxLength = 10000,
    trim = true,
    normalizeWhitespace = true,
  } = options
  
  if (!input) return ''
  
  let clean = input
  
  // Remove HTML if not allowed
  if (!allowHTML) {
    const result = sanitizeHTML(clean, 'strict')
    clean = result.clean
  } else {
    const result = sanitizeHTML(clean, 'relaxed')
    clean = result.clean
  }
  
  // Normalize whitespace
  if (normalizeWhitespace) {
    clean = clean.replace(/\s+/g, ' ')
  }
  
  // Trim
  if (trim) {
    clean = clean.trim()
  }
  
  // Enforce max length
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength)
  }
  
  return clean
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ''
  
  // Basic email sanitization
  let clean = email.toLowerCase().trim()
  
  // Remove dangerous characters
  clean = clean.replace(/[<>\"']/g, '')
  
  // Validate basic format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(clean)) {
    return ''
  }
  
  return clean
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (!url) return ''
  
  try {
    const parsed = new URL(url)
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return ''
    }
    
    // Check for dangerous protocols in the URL
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    if (dangerousProtocols.some(p => url.toLowerCase().includes(p))) {
      return ''
    }
    
    return parsed.toString()
  } catch {
    return ''
  }
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    allowHTML?: boolean
    maxDepth?: number
  } = {}
): T {
  const { allowHTML = false, maxDepth = 10 } = options
  
  if (maxDepth <= 0) return obj
  
  const result: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value, { allowHTML })
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'string'
            ? sanitizeInput(item, { allowHTML })
            : typeof item === 'object' && item !== null
            ? sanitizeObject(item, { allowHTML, maxDepth: maxDepth - 1 })
            : item
        )
      } else {
        result[key] = sanitizeObject(value, { allowHTML, maxDepth: maxDepth - 1 })
      }
    } else {
      result[key] = value
    }
  }
  
  return result as T
}

/**
 * Validate and sanitize form data
 */
export function validateFormData(
  data: Record<string, any>,
  schema: Record<string, {
    type: 'string' | 'email' | 'url' | 'number' | 'boolean'
    required?: boolean
    maxLength?: number
    allowHTML?: boolean
  }>
): {
  valid: boolean
  sanitized: Record<string, any>
  errors: string[]
} {
  const sanitized: Record<string, any> = {}
  const errors: string[] = []
  
  for (const [field, config] of Object.entries(schema)) {
    const value = data[field]
    
    // Check required
    if (config.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`)
      continue
    }
    
    // Skip if not required and empty
    if (!config.required && (value === undefined || value === null || value === '')) {
      continue
    }
    
    // Type-specific validation and sanitization
    switch (config.type) {
      case 'email':
        const cleanEmail = sanitizeEmail(String(value))
        if (!cleanEmail) {
          errors.push(`${field} has invalid email format`)
        } else {
          sanitized[field] = cleanEmail
        }
        break
        
      case 'url':
        const cleanURL = sanitizeURL(String(value))
        if (!cleanURL && value) {
          errors.push(`${field} has invalid URL format`)
        } else {
          sanitized[field] = cleanURL
        }
        break
        
      case 'string':
        let cleanString = sanitizeInput(String(value), {
          allowHTML: config.allowHTML,
          maxLength: config.maxLength,
        })
        
        // Security check
        const security = securityCheck(cleanString)
        if (!security.isValid) {
          errors.push(`${field} contains potentially dangerous content`)
        } else {
          sanitized[field] = cleanString
        }
        break
        
      case 'number':
        const num = Number(value)
        if (isNaN(num)) {
          errors.push(`${field} must be a valid number`)
        } else {
          sanitized[field] = num
        }
        break
        
      case 'boolean':
        sanitized[field] = Boolean(value)
        break
    }
  }
  
  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  }
}

/**
 * Middleware for request body sanitization
 */
export async function sanitizationMiddleware(
  request: Request
): Promise<{ sanitized: any; errors: string[] } | Response> {
  try {
    let body: any
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      body = Object.fromEntries(new URLSearchParams(text))
    } else {
      // For other content types, try to parse as JSON
      try {
        body = await request.json()
      } catch {
        body = {}
      }
    }
    
    // Security check on the entire body
    const security = securityCheck(body)
    if (!security.isValid) {
      return new Response(
        JSON.stringify({
          error: 'Security Violation',
          message: 'Request contains potentially malicious content',
          details: security.threats,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Sanitize the body
    const sanitized = sanitizeObject(body)
    
    return { sanitized, errors: [] }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Invalid Request',
        message: 'Could not parse request body',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
