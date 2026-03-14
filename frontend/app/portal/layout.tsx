'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PortalAuthService } from '@/lib/auth/portal-auth-client'
import { Customer } from '@/lib/types/portal'

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

const publicRoutes = ['/portal/login', '/portal/register', '/portal/reset-password']

// ============================================
// LOADING COMPONENT
// ============================================

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#212121] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center mx-auto mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
          />
        </div>
        <p className="text-apple-gray dark:text-[#636366]">Caricamento...</p>
      </motion.div>
    </div>
  )
}

// ============================================
// LAYOUT COMPONENT
// ============================================

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      const auth = PortalAuthService.getInstance()
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

      if (auth.isAuthenticated()) {
        setCustomer(null) // TODO: Get from auth context
        
        // If on public route, redirect to dashboard
        if (isPublicRoute) {
          router.push('/portal/dashboard')
          return
        }
      } else {
        // Not authenticated - redirect to login
        if (!isPublicRoute) {
          router.push('/portal/login')
          return
        }
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [pathname, router])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
