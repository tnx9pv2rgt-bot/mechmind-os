'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useInView } from './useInView'

/**
 * Memory optimization utilities for React components
 * 
 * Features:
 * - Automatic cleanup on unmount
 * - Large object management
 * - Intersection Observer for lazy loading
 * - Memory leak detection
 * - Performance monitoring
 */

interface MemoryStats {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  usagePercentage: number
}

interface UseMemoryOptimizationOptions {
  cleanupOnUnmount?: boolean
  trackPerformance?: boolean
  memoryThreshold?: number // MB
  onMemoryWarning?: (stats: MemoryStats) => void
}

/**
 * Hook: useMemoryOptimization
 * 
 * Provides memory management utilities for components
 * 
 * @example
 * const { ref, inView, clearCache, getMemoryStats } = useMemoryOptimization({
 *   cleanupOnUnmount: true,
 *   memoryThreshold: 100,
 *   onMemoryWarning: (stats) => console.warn('Memory high:', stats)
 * })
 */
export function useMemoryOptimization(options: UseMemoryOptimizationOptions = {}) {
  const {
    cleanupOnUnmount = true,
    trackPerformance = false,
    memoryThreshold = 100,
    onMemoryWarning,
  } = options

  const largeObjectsRef = useRef<Map<string, any>>(new Map())
  const observersRef = useRef<IntersectionObserver[]>([])
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([])
  const abortControllersRef = useRef<AbortController[]>([])

  // Intersection Observer for lazy loading
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '50px', // Start loading 50px before visible
  })

  /**
   * Register a large object for automatic cleanup
   */
  const registerLargeObject = useCallback((key: string, obj: any) => {
    largeObjectsRef.current.set(key, obj)
    return () => {
      largeObjectsRef.current.delete(key)
    }
  }, [])

  /**
   * Clear all registered large objects
   */
  const clearLargeObjects = useCallback(() => {
    largeObjectsRef.current.clear()
    if (typeof window !== 'undefined' && window.gc) {
      window.gc()
    }
  }, [])

  /**
   * Create AbortController with automatic tracking
   */
  const createAbortController = useCallback(() => {
    const controller = new AbortController()
    abortControllersRef.current.push(controller)
    return controller
  }, [])

  /**
   * Set timeout with automatic cleanup
   */
  const setTrackedTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(callback, delay)
    timeoutsRef.current.push(timeout)
    return timeout
  }, [])

  /**
   * Set interval with automatic cleanup
   */
  const setTrackedInterval = useCallback((callback: () => void, delay: number) => {
    const interval = setInterval(callback, delay)
    intervalsRef.current.push(interval)
    return interval
  }, [])

  /**
   * Get current memory stats
   */
  const getMemoryStats = useCallback((): MemoryStats | null => {
    const perfWithMemory = performance as unknown as Record<string, unknown>
    if (typeof window === 'undefined' || !perfWithMemory.memory) {
      return null
    }

    const memory = perfWithMemory.memory as { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
    const usedMB = memory.usedJSHeapSize / 1048576
    const totalMB = memory.totalJSHeapSize / 1048576
    const limitMB = memory.jsHeapSizeLimit / 1048576

    return {
      usedJSHeapSize: usedMB,
      totalJSHeapSize: totalMB,
      jsHeapSizeLimit: limitMB,
      usagePercentage: (usedMB / limitMB) * 100,
    }
  }, [])

  /**
   * Check memory and trigger warning if needed
   */
  const checkMemory = useCallback(() => {
    const stats = getMemoryStats()
    if (stats && stats.usedJSHeapSize > memoryThreshold) {
      onMemoryWarning?.(stats)
      console.warn('[Memory] High memory usage detected:', stats)
    }
    return stats
  }, [getMemoryStats, memoryThreshold, onMemoryWarning])

  /**
   * Force garbage collection (if available)
   */
  const forceGC = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).gc) {
      ;(window as unknown as Record<string, () => void>).gc()
      return true
    }
    return false
  }, [])

  /**
   * Cleanup all resources
   */
  const cleanup = useCallback(() => {
    // Clear timeouts
    timeoutsRef.current.forEach((t) => clearTimeout(t))
    timeoutsRef.current = []

    // Clear intervals
    intervalsRef.current.forEach((i) => clearInterval(i))
    intervalsRef.current = []

    // Abort fetch requests
    abortControllersRef.current.forEach((controller) => {
      try {
        controller.abort()
      } catch {
        // Ignore abort errors
      }
    })
    abortControllersRef.current = []

    // Clear large objects
    largeObjectsRef.current.clear()

    // Disconnect observers
    observersRef.current.forEach((observer) => observer.disconnect())
    observersRef.current = []

    // Clear form cache if exists
    if (typeof window !== 'undefined' && (window as any).formCache) {
      ;(window as any).formCache.clear()
    }

    // Force garbage collection in development
    if (process.env.NODE_ENV === 'development') {
      forceGC()
    }
  }, [forceGC])

  // Performance tracking
  useEffect(() => {
    if (!trackPerformance || typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log(`[Performance] ${entry.name}: ${entry.duration}ms`)
        }
      }
    })

    observer.observe({ entryTypes: ['measure', 'navigation'] })

    return () => {
      observer.disconnect()
    }
  }, [trackPerformance])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupOnUnmount) {
        cleanup()
      }
    }
  }, [cleanup, cleanupOnUnmount])

  return {
    ref,
    inView,
    registerLargeObject,
    clearLargeObjects,
    createAbortController,
    setTrackedTimeout,
    setTrackedInterval,
    getMemoryStats,
    checkMemory,
    forceGC,
    cleanup,
  }
}

/**
 * Hook: useVirtualList
 * 
 * Virtual scrolling for long lists
 * 
 * @example
 * const { visibleItems, containerRef, totalHeight } = useVirtualList({
 *   items: largeArray,
 *   itemHeight: 50,
 *   overscan: 5
 * })
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
}: {
  items: T[]
  itemHeight: number
  overscan?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      setContainerHeight(container.clientHeight)
    }

    updateDimensions()

    const handleScroll = () => {
      setScrollTop(container.scrollTop)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateDimensions)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex).map((item, index) => ({
    item,
    index: startIndex + index,
    style: {
      position: 'absolute' as const,
      top: (startIndex + index) * itemHeight,
      height: itemHeight,
      left: 0,
      right: 0,
    },
  }))

  return {
    visibleItems,
    containerRef,
    totalHeight,
    startIndex,
    endIndex,
  }
}

/**
 * Hook: useDebouncedCallback
 * 
 * Debounce function calls with cleanup
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

/**
 * Hook: useThrottle
 * 
 * Throttle function calls with cleanup
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
) {
  const inThrottle = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args)
        inThrottle.current = true
        timeoutRef.current = setTimeout(() => {
          inThrottle.current = false
        }, limit)
      }
    },
    [callback, limit]
  )
}

export default useMemoryOptimization
