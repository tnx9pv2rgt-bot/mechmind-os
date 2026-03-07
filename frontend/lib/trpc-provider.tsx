/**
 * tRPC Provider - MechMind OS Frontend
 * 
 * Provides tRPC and React Query context to the application.
 * Includes SSR hydration support, global error handling, and
 * offline state management.
 * 
 * @module lib/trpc-provider
 * @version 1.0.0
 * @requires @trpc/react-query
 * @requires @tanstack/react-query
 */

'use client'

import React, { useState, ReactNode, Component, ErrorInfo } from 'react'
import { QueryClient, QueryClientProvider, dehydrate, Hydrate } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { API_URL } from './trpc-client'
import type { AppRouter } from './trpc-router-types'

// =============================================================================
// tRPC React Instance
// =============================================================================

/**
 * Type-safe tRPC hooks for React components
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: vehicles } = trpc.vehicle.list.useQuery({ page: 1, limit: 10 })
 *   const createBooking = trpc.booking.create.useMutation()
 *   
 *   return (
 *     // ...
 *   )
 * }
 * ```
 */
export const trpc = createTRPCReact<AppRouter>({
  unstable_overrides: {
    useMutation: {
      /**
       * Default mutation options for all mutations
       */
      async onSuccess(opts) {
        /**
         * Default behavior: invalidate related queries on successful mutation
         * This can be customized per-mutation
         */
        await opts.originalFn()
      },
    },
  },
})

// =============================================================================
// Query Client Configuration
// =============================================================================

/**
 * Default React Query configuration
 */
const defaultQueryConfig = {
  /**
   * Default stale time - data remains fresh for 5 minutes
   * Reduces unnecessary refetches
   */
  staleTime: 5 * 60 * 1000, // 5 minutes
  /**
   * Default cache time - unused data kept in cache for 10 minutes
   */
  gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  /**
   * Retry failed queries 2 times (3 total attempts)
   */
  retry: 2,
  /**
   * Refetch on window focus - disabled for better UX
   * Set to true if you want data to refresh when user returns to app
   */
  refetchOnWindowFocus: false,
  /**
   * Refetch when reconnecting after being offline
   */
  refetchOnReconnect: true,
}

/**
 * Creates a new QueryClient instance with default configuration
 * 
 * @returns Configured QueryClient instance
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: defaultQueryConfig,
      mutations: {
        /**
         * Retry mutations only for network errors, not for client/server errors
         */
        retry: (failureCount, error: unknown) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && 'statusCode' in error) {
            const statusCode = (error as { statusCode: number }).statusCode
            if (statusCode >= 400 && statusCode < 500) {
              return false
            }
          }
          return failureCount < 2
        },
      },
    },
  })
}

// =============================================================================
// Error Boundary Component
// =============================================================================

/**
 * Props for TRPCErrorBoundary
 */
interface TRPCErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback component to render on error */
  fallback?: ReactNode
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

/**
 * State for TRPCErrorBoundary
 */
interface TRPCErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary for catching and handling tRPC/React Query errors
 * 
 * @example
 * ```tsx
 * <TRPCErrorBoundary fallback={<ErrorPage />}>
 *   <MyDataComponent />
 * </TRPCErrorBoundary>
 * ```
 */
export class TRPCErrorBoundary extends Component<TRPCErrorBoundaryProps, TRPCErrorBoundaryState> {
  constructor(props: TRPCErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): TRPCErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TRPCErrorBoundary] Caught error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 mb-4">
            We encountered an error while loading data. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-4 p-4 bg-red-100 rounded text-xs overflow-auto">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// =============================================================================
// tRPC Provider Component
// =============================================================================

/**
 * Props for TRPCProvider
 */
interface TRPCProviderProps {
  children: ReactNode
  /** Server-side dehydrated state for SSR hydration */
  dehydratedState?: unknown
}

/**
 * tRPC Provider Component
 * 
 * Wraps the application with tRPC and React Query providers.
 * Handles client initialization, SSR hydration, and offline state.
 * 
 * @example
 * ```tsx
 * // In your root layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <TRPCProvider>
 *       {children}
 *     </TRPCProvider>
 *   )
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // With SSR hydration
 * export default async function Page() {
 *   const helpers = createServerHelpers()
 *   await helpers.vehicle.list.prefetch({ page: 1 })
 *   
 *   return (
 *     <TRPCProvider dehydratedState={dehydrate(helpers.queryClient)}>
 *       <VehicleList />
 *     </TRPCProvider>
 *   )
 * }
 * ```
 */
export function TRPCProvider({ children, dehydratedState }: TRPCProviderProps) {
  /**
   * Create QueryClient once per component lifecycle
   * Using useState with a function ensures single instance
   */
  const [queryClient] = useState(() => createQueryClient())

  /**
   * Create tRPC client once per component lifecycle
   */
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: API_URL,
          /**
           * Add headers to each request
           * Runs on every request to get fresh auth token
           */
          headers: () => {
            const headers: Record<string, string> = {
              'x-client-version': '10.0.0',
            }
            
            // Add auth token if available
            if (typeof window !== 'undefined') {
              const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('auth_token='))
                ?.split('=')[1]
              
              if (token) {
                headers['Authorization'] = `Bearer ${token}`
              }
            }
            
            return headers
          },
          /**
           * Maximum URL length for batch requests
           * Prevents 414 URI Too Long errors
           */
          maxURLLength: 2083,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={dehydratedState}>
          <TRPCErrorBoundary>
            {children}
          </TRPCErrorBoundary>
        </Hydrate>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Creates server-side helpers for prefetching data during SSR
 * 
 * @example
 * ```tsx
 * // app/dashboard/page.tsx
 * import { createServerHelpers } from '@/lib/trpc-provider'
 * 
 * export default async function DashboardPage() {
 *   const helpers = createServerHelpers()
 *   
 *   // Prefetch data on server
 *   await helpers.analytics.summary.prefetch({ period: 'month' })
 *   await helpers.vehicle.stats.prefetch()
 *   
 *   return (
 *     <TRPCProvider dehydratedState={dehydrate(helpers.queryClient)}>
 *       <Dashboard />
 *     </TRPCProvider>
 *   )
 * }
 * ```
 */
export function createServerHelpers() {
  const queryClient = createQueryClient()
  
  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
        headers: {
          // Server-side requests may need service-to-service auth
          'x-service-key': process.env.INTERNAL_API_KEY || '',
        },
      }),
    ],
  })

  return {
    queryClient,
    trpc: trpc.createClient({
      links: [
        httpBatchLink({
          url: API_URL,
          headers: {
            'x-service-key': process.env.INTERNAL_API_KEY || '',
          },
        }),
      ],
    }),
  }
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { dehydrate, Hydrate as HydrationBoundary, QueryClient }
export type { QueryClientProvider }
