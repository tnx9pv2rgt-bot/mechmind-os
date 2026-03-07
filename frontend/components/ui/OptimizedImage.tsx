'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  containerClassName?: string
  sizes?: string
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: () => void
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

// Default blur placeholder (tiny transparent pixel)
const DEFAULT_BLUR_DATA_URL = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'

// Generate responsive sizes string
const generateSizes = (width?: number): string => {
  if (width) {
    return `(max-width: ${width}px) 100vw, ${width}px`
  }
  return '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
}

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Automatic WebP/AVIF format selection
 * - Responsive sizes
 * - Lazy loading with blur placeholder
 * - Priority loading for above-fold images
 * - Error handling with fallback
 * - Smooth fade-in animation
 * 
 * @example
 * <OptimizedImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   width={1200}
 *   height={600}
 *   priority
 * />
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className,
  containerClassName,
  sizes,
  quality = 85,
  placeholder = 'blur',
  blurDataURL = DEFAULT_BLUR_DATA_URL,
  loading = 'lazy',
  onLoad,
  onError,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  // Generate sizes if not provided
  const responsiveSizes = sizes || generateSizes(width)

  // Object fit style
  const objectFitStyle = { objectFit }

  // Error state fallback
  if (hasError) {
    return (
      <div 
        className={cn(
          'bg-gray-100 dark:bg-gray-800 flex items-center justify-center',
          fill ? 'w-full h-full' : '',
          containerClassName
        )}
        style={!fill ? { width, height } : undefined}
      >
        <div className="text-gray-400 dark:text-gray-600 text-center p-4">
          <svg 
            className="w-8 h-8 mx-auto mb-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          <span className="text-sm">Failed to load image</span>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        fill ? 'w-full h-full' : '',
        containerClassName
      )}
      style={!fill ? { width, height } : undefined}
    >
      {/* Loading placeholder */}
      {!isLoaded && (
        <div 
          className={cn(
            'absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse',
            fill ? 'w-full h-full' : ''
          )}
          style={!fill ? { width, height } : undefined}
          aria-hidden="true"
        />
      )}
      
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        sizes={responsiveSizes}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        loading={priority ? 'eager' : loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-500 ease-in-out',
          isLoaded ? 'opacity-100' : 'opacity-0',
          fill ? 'absolute inset-0 w-full h-full' : '',
          className
        )}
        style={objectFitStyle}
      />
    </div>
  )
}

/**
 * AvatarImage - Optimized for user avatars
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string
  alt: string
  size?: number
  className?: string
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      sizes={`${size}px`}
      quality={90}
    />
  )
}

/**
 * HeroImage - Optimized for hero sections
 */
export function HeroImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      priority
      className={cn('object-cover', className)}
      sizes="100vw"
      quality={90}
    />
  )
}

/**
 * ThumbnailImage - Optimized for lists and grids
 */
export function ThumbnailImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={200}
      height={150}
      className={cn('rounded-md', className)}
      sizes="200px"
      quality={75}
    />
  )
}

export default OptimizedImage
