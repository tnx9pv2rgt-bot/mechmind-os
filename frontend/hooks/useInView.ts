'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseInViewOptions {
  threshold?: number | number[]
  rootMargin?: string
  triggerOnce?: boolean
  root?: Element | null
}

interface UseInViewReturn {
  ref: React.RefObject<HTMLElement>
  inView: boolean
  entry?: IntersectionObserverEntry
}

/**
 * useInView Hook
 * 
 * Custom implementation of intersection observer for lazy loading
 * Falls back to native react-intersection-observer if available
 * 
 * @example
 * const { ref, inView } = useInView({
 *   threshold: 0,
 *   triggerOnce: true,
 *   rootMargin: '50px'
 * })
 */
export function useInView(options: UseInViewOptions = {}): UseInViewReturn {
  const { threshold = 0, rootMargin = '0px', triggerOnce = false, root = null } = options
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | undefined>()

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      setEntry(entry)
      
      if (entry.isIntersecting) {
        setInView(true)
        
        if (triggerOnce && ref.current) {
          // Disconnect observer after first intersection
          // This will be handled in cleanup
        }
      } else if (!triggerOnce) {
        setInView(false)
      }
    },
    [triggerOnce]
  )

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Skip if triggerOnce and already in view
    if (triggerOnce && inView) return

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
      root,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, root, triggerOnce, inView, handleIntersection])

  return { ref: ref as React.RefObject<HTMLElement>, inView, entry }
}

export default useInView
