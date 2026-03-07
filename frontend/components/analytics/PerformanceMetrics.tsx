'use client'

import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null // Largest Contentful Paint
  fcp: number | null // First Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  inp: number | null // Interaction to Next Paint
  
  // Additional metrics
  fcpTime: number | null
  loadTime: number | null
  domInteractive: number | null
  domComplete: number | null
  
  // Resource loading
  resourceCount: number
  totalTransferSize: number
}

interface PerformanceMetricsProps {
  showDetails?: boolean
  onMetricsCollected?: (metrics: PerformanceMetrics) => void
}

/**
 * PerformanceMetrics Component
 * 
 * Monitors and displays Core Web Vitals and other performance metrics.
 * Only active in development mode by default.
 * 
 * @example
 * <PerformanceMetrics showDetails={true} />
 */
export function PerformanceMetrics({
  showDetails = false,
  onMetricsCollected,
}: PerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    inp: null,
    fcpTime: null,
    loadTime: null,
    domInteractive: null,
    domComplete: null,
    resourceCount: 0,
    totalTransferSize: 0,
  })
  
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return
    
    // Only show by default in development
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true)
    }

    // Performance Observer for Core Web Vitals
    const observePerformance = () => {
      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
        setMetrics((prev) => ({ ...prev, lcp: lastEntry.startTime }))
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const firstEntry = entries[0] as PerformanceEntry & { processingStart: number; startTime: number }
        setMetrics((prev) => ({
          ...prev,
          fid: firstEntry.processingStart - firstEntry.startTime,
        }))
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // CLS
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value
          }
        }
        setMetrics((prev) => ({ ...prev, cls: clsValue }))
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })

      // INP (Interaction to Next Paint)
      let inpValue = 0
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        for (const entry of entries) {
          const event = entry as PerformanceEntry & { duration: number }
          if (event.duration > inpValue) {
            inpValue = event.duration
          }
        }
        setMetrics((prev) => ({ ...prev, inp: inpValue }))
      })
      inpObserver.observe({ entryTypes: ['event'] })

      // Navigation Timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        for (const entry of entries) {
          const navEntry = entry as PerformanceNavigationTiming
          
          setMetrics((prev) => ({
            ...prev,
            fcpTime: navEntry.responseEnd - navEntry.startTime,
            loadTime: navEntry.loadEventEnd - navEntry.startTime,
            domInteractive: navEntry.domInteractive - navEntry.startTime,
            domComplete: navEntry.domComplete - navEntry.startTime,
            ttfb: navEntry.responseStart - navEntry.startTime,
          }))
        }
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })

      // Resource loading stats
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[]
        const totalSize = entries.reduce((sum, entry) => {
          return sum + (entry.transferSize || 0)
        }, 0)
        
        setMetrics((prev) => ({
          ...prev,
          resourceCount: entries.length,
          totalTransferSize: totalSize,
        }))
      })
      resourceObserver.observe({ entryTypes: ['resource'] })

      // Cleanup
      return () => {
        lcpObserver.disconnect()
        fidObserver.disconnect()
        clsObserver.disconnect()
        inpObserver.disconnect()
        navigationObserver.disconnect()
        resourceObserver.disconnect()
      }
    }

    const cleanup = observePerformance()
    
    return cleanup
  }, [])

  // Notify parent when metrics change
  useEffect(() => {
    onMetricsCollected?.(metrics)
  }, [metrics, onMetricsCollected])

  // Toggle visibility with keyboard shortcut (Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'P') {
        setIsVisible((prev) => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs opacity-50 hover:opacity-100 transition-opacity"
      >
        Show Metrics
      </button>
    )
  }

  // Rating colors
  const getRating = (value: number | null, thresholds: { good: number; poor: number }) => {
    if (value === null) return 'text-gray-500'
    if (value <= thresholds.good) return 'text-green-500'
    if (value <= thresholds.poor) return 'text-yellow-500'
    return 'text-red-500'
  }

  const formatMs = (value: number | null) => {
    if (value === null) return '-'
    return `${Math.round(value)}ms`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Performance Metrics</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
      
      {/* Core Web Vitals */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>LCP (Largest Contentful Paint)</span>
          <span className={getRating(metrics.lcp, { good: 2500, poor: 4000 })}>
            {formatMs(metrics.lcp)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>FID (First Input Delay)</span>
          <span className={getRating(metrics.fid, { good: 100, poor: 300 })}>
            {formatMs(metrics.fid)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>CLS (Cumulative Layout Shift)</span>
          <span className={getRating(metrics.cls, { good: 0.1, poor: 0.25 })}>
            {metrics.cls?.toFixed(3) ?? '-'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>INP (Interaction to Next Paint)</span>
          <span className={getRating(metrics.inp, { good: 200, poor: 500 })}>
            {formatMs(metrics.inp)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>TTFB (Time to First Byte)</span>
          <span className={getRating(metrics.ttfb, { good: 800, poor: 1800 })}>
            {formatMs(metrics.ttfb)}
          </span>
        </div>
        
        {showDetails && (
          <>
            <hr className="border-gray-700 my-2" />
            <div className="flex justify-between">
              <span>FCP (First Contentful Paint)</span>
              <span className={getRating(metrics.fcpTime, { good: 1800, poor: 3000 })}>
                {formatMs(metrics.fcpTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Load Time</span>
              <span>{formatMs(metrics.loadTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>DOM Interactive</span>
              <span>{formatMs(metrics.domInteractive)}</span>
            </div>
            <div className="flex justify-between">
              <span>DOM Complete</span>
              <span>{formatMs(metrics.domComplete)}</span>
            </div>
            <div className="flex justify-between">
              <span>Resources</span>
              <span>{metrics.resourceCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Transfer Size</span>
              <span>{formatBytes(metrics.totalTransferSize)}</span>
            </div>
          </>
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Press Shift+P to toggle
      </div>
    </div>
  )
}

export default PerformanceMetrics
