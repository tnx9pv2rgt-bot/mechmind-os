'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  FileText,
  Wrench,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Car,
  User,
  ChevronRight,
  Bell
} from 'lucide-react'
import { AppleButton } from '@/components/ui/apple-button'
import { portalAuth } from '@/lib/auth/portal-auth'
import { Customer } from '@/lib/types/portal'

// ============================================
// NAVIGATION ITEMS
// ============================================

const navigation = [
  { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
  { name: 'Prenotazioni', href: '/portal/bookings', icon: Calendar, badge: 'NEW' },
  { name: 'Ispezioni', href: '/portal/inspections', icon: ClipboardCheck },
  { name: 'Documenti', href: '/portal/documents', icon: FileText },
  { name: 'Manutenzione', href: '/portal/maintenance', icon: Wrench },
  { name: 'Garanzia', href: '/portal/warranty', icon: Shield },
  { name: 'Impostazioni', href: '/portal/settings', icon: Settings },
]

// ============================================
// PROPS
// ============================================

interface PortalLayoutProps {
  children: React.ReactNode
  customer?: Customer
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PortalLayout({ children, customer }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('portal_token')
      localStorage.removeItem('portal_user')
    }
    router.push('/portal/login')
  }

  const customerInitials = customer 
    ? `${customer.firstName[0]}${customer.lastName[0]}`.toUpperCase()
    : '??'

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-apple border-b border-apple-border/50 h-14">
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-apple-light-gray transition-colors"
          >
            <Menu className="h-5 w-5 text-apple-dark" />
          </button>
          
          <Link href="/portal/dashboard" className="font-semibold text-apple-dark">
            MechMind Portal
          </Link>
          
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white text-xs font-medium">
            {customerInitials}
          </div>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white border-r border-apple-border/50
          lg:translate-x-0 lg:static lg:h-screen
          ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        `}
        initial={false}
        animate={{ 
          x: isMobile ? (sidebarOpen ? 0 : '-100%') : 0,
          width: 280
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-5 border-b border-apple-border/30">
            <Link href="/portal/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-apple-dark leading-tight">MechMind</p>
                <p className="text-xs text-apple-gray">Customer Portal</p>
              </div>
            </Link>
            
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl hover:bg-apple-light-gray transition-colors"
              >
                <X className="h-5 w-5 text-apple-dark" />
              </button>
            )}
          </div>

          {/* Customer Info */}
          {customer && (
            <div className="p-5 border-b border-apple-border/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white font-semibold">
                  {customerInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-apple-dark truncate">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-xs text-apple-gray truncate">{customer.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                        ${isActive 
                          ? 'bg-apple-blue text-white shadow-apple' 
                          : 'text-apple-dark hover:bg-apple-light-gray'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className={`
                          px-2 py-0.5 text-[10px] rounded-full font-semibold
                          ${isActive ? 'bg-white/20 text-white' : 'bg-apple-green text-white'}
                        `}>
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-apple-border/30">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-apple-red hover:bg-red-50 transition-all"
            >
              <LogOut className="h-5 w-5" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`
        lg:ml-0 min-h-screen transition-all duration-300
        ${isMobile ? 'pt-14' : ''}
      `}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-apple border-t border-apple-border/50 px-2 pb-safe">
          <div className="flex items-center justify-around h-16">
            {navigation.slice(0, 5).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all
                    ${isActive ? 'text-apple-blue' : 'text-apple-gray'}
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
                  {isActive && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-apple-blue" />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}

// ============================================
// PORTAL PAGE WRAPPER
// ============================================

interface PortalPageWrapperProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  customer?: Customer
  action?: React.ReactNode
}

export function PortalPageWrapper({ 
  children, 
  title, 
  subtitle, 
  customer,
  action 
}: PortalPageWrapperProps) {
  return (
    <PortalLayout customer={customer}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-apple-dark">{title}</h1>
              {subtitle && <p className="text-apple-gray mt-1">{subtitle}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        </motion.div>

        {/* Page Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {children}
        </motion.div>
      </div>
    </PortalLayout>
  )
}
