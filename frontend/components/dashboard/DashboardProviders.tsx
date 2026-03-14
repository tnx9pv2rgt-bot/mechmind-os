'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/useAuth'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DemoProvider } from '@/lib/demo-context'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        cacheTime: 5 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  })
}

/**
 * Wraps dashboard pages with:
 * 1. QueryClientProvider (React Query)
 * 2. DemoProvider (demo banner + click tracking)
 * 3. AuthProvider (session check — demo_session cookie handled by /api/auth/me)
 * 4. AuthGuard (redirect if not authenticated)
 */
export function DashboardProviders({ children, initialIsDemo = false }: { children: React.ReactNode; initialIsDemo?: boolean }) {
  const [queryClient] = useState(() => makeQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider initialIsDemo={initialIsDemo}>
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </AuthProvider>
      </DemoProvider>
    </QueryClientProvider>
  )
}
