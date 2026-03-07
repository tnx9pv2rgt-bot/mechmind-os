/**
 * React Hooks for Security Features
 * Client-side security utilities
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================
// CSRF Token Hook
// ============================================

export interface UseCSRFReturn {
  token: string | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  getHeaders: () => Record<string, string>
}

/**
 * Hook for managing CSRF tokens
 */
export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchToken = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/csrf/token')
      if (!response.ok) throw new Error('Failed to fetch CSRF token')
      const data = await response.json()
      setToken(data.token)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchToken()
  }, [fetchToken])
  
  const getHeaders = useCallback(() => {
    return token ? { 'X-CSRF-Token': token } : {}
  }, [token])
  
  return {
    token,
    loading,
    error,
    refresh: fetchToken,
    getHeaders,
  }
}

// ============================================
// Form Protection Hook
// ============================================

export interface UseFormProtectionReturn {
  formStartTime: number
  honeypotName: string
  recaptchaToken: string | null
  isSubmitting: boolean
  botScore: number | null
  startProtection: () => void
  validateProtection: () => { valid: boolean; errors: string[] }
  getProtectionData: () => {
    formStartTime: number
    honeypotValue: string
    recaptchaToken: string | null
    browserFingerprint: string
  }
}

/**
 * Hook for protecting forms from bots
 * Includes timing checks, honeypot fields, and fingerprinting
 */
export function useFormProtection(
  options: {
    minFillTime?: number // Minimum time to fill form (ms)
    enableHoneypot?: boolean
    enableFingerprint?: boolean
    recaptchaSiteKey?: string
  } = {}
): UseFormProtectionReturn {
  const {
    minFillTime = 3000,
    enableHoneypot = true,
    enableFingerprint = true,
    recaptchaSiteKey,
  } = options
  
  const [formStartTime, setFormStartTime] = useState<number>(0)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [botScore, setBotScore] = useState<number | null>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  
  // Generate random honeypot field name
  const honeypotName = useRef(`website_${Math.random().toString(36).slice(2, 11)}`).current
  
  const startProtection = useCallback(() => {
    setFormStartTime(Date.now())
    
    // Load reCAPTCHA if enabled
    if (recaptchaSiteKey && typeof window !== 'undefined' && (window as any).grecaptcha) {
      ;(window as any).grecaptcha.ready(() => {
        ;(window as any).grecaptcha
          .execute(recaptchaSiteKey, { action: 'submit' })
          .then((token: string) => {
            setRecaptchaToken(token)
          })
      })
    }
  }, [recaptchaSiteKey])
  
  const generateFingerprint = useCallback((): string => {
    if (typeof window === 'undefined') return ''
    
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      navigator.hardwareConcurrency,
    ]
    
    return btoa(components.join('|')).slice(0, 32)
  }, [])
  
  const validateProtection = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Check timing
    if (formStartTime > 0) {
      const timeSpent = Date.now() - formStartTime
      if (timeSpent < minFillTime) {
        errors.push('Form completed too quickly')
        setBotScore(prev => (prev || 0) + 25)
      }
    }
    
    // Check honeypot
    if (enableHoneypot && honeypotRef.current?.value) {
      errors.push('Honeypot triggered')
      setBotScore(prev => (prev || 0) + 50)
    }
    
    return {
      valid: errors.length === 0,
      errors,
    }
  }, [formStartTime, minFillTime, enableHoneypot])
  
  const getProtectionData = useCallback(() => {
    return {
      formStartTime,
      honeypotValue: honeypotRef.current?.value || '',
      recaptchaToken,
      browserFingerprint: enableFingerprint ? generateFingerprint() : '',
    }
  }, [formStartTime, recaptchaToken, enableFingerprint, generateFingerprint])
  
  return {
    formStartTime,
    honeypotName,
    recaptchaToken,
    isSubmitting,
    botScore,
    startProtection,
    validateProtection,
    getProtectionData,
  }
}

// ============================================
// Security Status Hook
// ============================================

export interface SecurityStatus {
  isSecure: boolean
  https: boolean
  secureContext: boolean
  warnings: string[]
}

/**
 * Hook to check browser security status
 */
export function useSecurityStatus(): SecurityStatus {
  const [status, setStatus] = useState<SecurityStatus>({
    isSecure: true,
    https: true,
    secureContext: true,
    warnings: [],
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const warnings: string[] = []
    
    // Check HTTPS
    const https = window.location.protocol === 'https:'
    if (!https) {
      warnings.push('Connection is not secure (HTTPS)')
    }
    
    // Check secure context
    const secureContext = window.isSecureContext
    if (!secureContext) {
      warnings.push('Not running in a secure context')
    }
    
    setStatus({
      isSecure: https && secureContext && warnings.length === 0,
      https,
      secureContext,
      warnings,
    })
  }, [])
  
  return status
}

// ============================================
// Rate Limit Status Hook
// ============================================

export interface RateLimitStatus {
  remaining: number
  limit: number
  reset: number
  limited: boolean
}

/**
 * Hook to track rate limit status from API responses
 */
export function useRateLimit(): {
  status: RateLimitStatus | null
  updateFromHeaders: (headers: Headers) => void
} {
  const [status, setStatus] = useState<RateLimitStatus | null>(null)
  
  const updateFromHeaders = useCallback((headers: Headers) => {
    const remaining = headers.get('X-RateLimit-Remaining')
    const limit = headers.get('X-RateLimit-Limit')
    const reset = headers.get('X-RateLimit-Reset')
    const retryAfter = headers.get('Retry-After')
    
    if (remaining || limit || reset) {
      setStatus({
        remaining: remaining ? parseInt(remaining, 10) : 100,
        limit: limit ? parseInt(limit, 10) : 100,
        reset: reset ? parseInt(reset, 10) : Date.now() + 60000,
        limited: !!retryAfter,
      })
    }
  }, [])
  
  return { status, updateFromHeaders }
}

// ============================================
// Bot Detection Hook (Client-side)
// ============================================

export interface BotDetectionState {
  isBot: boolean
  confidence: 'low' | 'medium' | 'high'
  indicators: string[]
}

/**
 * Hook for client-side bot detection
 * Detects automation tools and suspicious behavior
 */
export function useBotDetection(): BotDetectionState {
  const [state, setState] = useState<BotDetectionState>({
    isBot: false,
    confidence: 'low',
    indicators: [],
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const indicators: string[] = []
    let score = 0
    
    // Check for automation indicators
    if ((window as any).__nightmare) {
      indicators.push('Nightmare.js detected')
      score += 40
    }
    
    if ((window as any).callPhantom) {
      indicators.push('PhantomJS detected')
      score += 40
    }
    
    if ((window as any)._phantom) {
      indicators.push('PhantomJS detected')
      score += 40
    }
    
    if (navigator.webdriver) {
      indicators.push('WebDriver detected')
      score += 35
    }
    
    // Check for headless Chrome indicators
    if (/HeadlessChrome/.test(navigator.userAgent)) {
      indicators.push('Headless Chrome detected')
      score += 30
    }
    
    // Check for plugins (headless browsers often have 0)
    if (navigator.plugins.length === 0) {
      indicators.push('No browser plugins')
      score += 10
    }
    
    // Check for languages
    if (navigator.languages.length === 0) {
      indicators.push('No languages detected')
      score += 10
    }
    
    // Determine confidence
    let confidence: 'low' | 'medium' | 'high' = 'low'
    if (score >= 50) confidence = 'high'
    else if (score >= 30) confidence = 'medium'
    
    setState({
      isBot: score >= 40,
      confidence,
      indicators,
    })
  }, [])
  
  return state
}

// ============================================
// Secure Fetch Hook
// ============================================

export interface UseSecureFetchOptions extends RequestInit {
  csrfToken?: string
  retries?: number
  retryDelay?: number
}

export interface UseSecureFetchReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  execute: (url: string, options?: UseSecureFetchOptions) => Promise<T | null>
}

/**
 * Hook for making secure API calls with automatic CSRF handling
 */
export function useSecureFetch<T = any>(): UseSecureFetchReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { token: csrfToken } = useCSRF()
  const { updateFromHeaders } = useRateLimit()
  
  const execute = useCallback(async (
    url: string,
    options: UseSecureFetchOptions = {}
  ): Promise<T | null> => {
    const { retries = 0, retryDelay = 1000, ...fetchOptions } = options
    
    setLoading(true)
    setError(null)
    
    try {
      // Add CSRF token if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((fetchOptions.headers as Record<string, string>) || {}),
      }
      
      if (csrfToken && !['GET', 'HEAD'].includes(fetchOptions.method || 'GET')) {
        headers['X-CSRF-Token'] = csrfToken
      }
      
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      })
      
      // Update rate limit status
      updateFromHeaders(response.headers)
      
      // Handle rate limiting with retry
      if (response.status === 429 && retries > 0) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10)
        await new Promise(r => setTimeout(r, retryAfter * 1000 || retryDelay))
        return execute(url, { ...options, retries: retries - 1 })
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [csrfToken, updateFromHeaders])
  
  return { data, loading, error, execute }
}

// ============================================
// Form Timing Hook
// ============================================

export interface FormTiming {
  startTime: number
  endTime: number
  duration: number
}

/**
 * Hook to track form fill timing
 * Useful for bot detection
 */
export function useFormTiming(): {
  timing: FormTiming
  start: () => void
  end: () => number
  isValidDuration: (minMs?: number) => boolean
} {
  const [timing, setTiming] = useState<FormTiming>({
    startTime: 0,
    endTime: 0,
    duration: 0,
  })
  
  const start = useCallback(() => {
    setTiming({ startTime: Date.now(), endTime: 0, duration: 0 })
  }, [])
  
  const end = useCallback((): number => {
    const endTime = Date.now()
    setTiming(prev => {
      const duration = prev.startTime ? endTime - prev.startTime : 0
      return { ...prev, endTime, duration }
    })
    return endTime - timing.startTime
  }, [timing.startTime])
  
  const isValidDuration = useCallback((minMs: number = 3000): boolean => {
    return timing.duration >= minMs
  }, [timing.duration])
  
  return { timing, start, end, isValidDuration }
}

// ============================================
// Honeypot Field Component
// ============================================

import React from 'react'

interface HoneypotFieldProps {
  name: string
  label?: string
}

/**
 * Honeypot field component for form protection
 * Hidden from real users but visible to bots
 */
export const HoneypotField: React.FC<HoneypotFieldProps> = ({ name, label }) => {
  return (
    <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
      <label htmlFor={name}>{label || 'Leave this field empty'}</label>
      <input
        type="text"
        id={name}
        name={name}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  )
}
