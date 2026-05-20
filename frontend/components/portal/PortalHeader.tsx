'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell,
  LogOut,
  Settings,
  User,
  X,
  Menu,
  ChevronDown
} from 'lucide-react'
// Portal auth service (class singleton used for full auth flow)
import { Customer } from '@/lib/types/portal'

// ============================================
// PROPS
// ============================================

interface PortalHeaderProps {
  customer?: Customer
  onMenuClick?: () => void
  notificationCount?: number
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PortalHeader({ 
  customer, 
  onMenuClick,
  notificationCount = 0 
}: PortalHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()

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

  const customerFullName = customer
    ? `${customer.firstName} ${customer.lastName}`
    : 'Utente'

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface-secondary)] backdrop-blur-apple border-b border-[var(--border-default)]/50">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left: Menu Button (Mobile) */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
          >
            <Menu className="h-5 w-5 text-[var(--text-primary)]" />
          </button>

          <Link href="/portal/dashboard" className="hidden sm:block">
            <span className="font-semibold text-[var(--text-primary)]">Customer Portal</span>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowProfileMenu(false)
              }}
              className="relative p-2 rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
            >
              <Bell className="h-5 w-5 text-[var(--text-primary)]" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--status-error)] rounded-full" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 bg-[var(--surface-secondary)] rounded-2xl shadow-apple-lg border border-[var(--border-default)]/30 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]/30">
                    <h3 className="font-semibold text-[var(--text-primary)]">Notifiche</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <X className="h-4 w-4 text-[var(--text-tertiary)]" />
                    </button>
                  </div>
                  <div className="p-4 text-center text-[var(--text-tertiary)]">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nessuna notifica</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 sm:gap-3 p-2 pr-3 sm:pr-4 rounded-2xl hover:bg-[var(--surface-secondary)] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)] flex items-center justify-center text-[var(--text-on-brand)] text-xs font-medium">
                {customerInitials}
              </div>
              <span className="hidden sm:block text-sm font-medium text-[var(--text-primary)]">
                {customerFullName}
              </span>
              <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)] hidden sm:block" />
            </button>

            {/* Profile Menu Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-64 bg-[var(--surface-secondary)] rounded-2xl shadow-apple-lg border border-[var(--border-default)]/30 overflow-hidden"
                >
                  <div className="p-4 border-b border-[var(--border-default)]/30">
                    <p className="font-semibold text-[var(--text-primary)]">{customerFullName}</p>
                    <p className="text-sm text-[var(--text-tertiary)] truncate">{customer?.email}</p>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/portal/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>Profilo</span>
                    </Link>
                    <Link
                      href="/portal/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Impostazioni</span>
                    </Link>
                  </div>

                  <div className="p-2 border-t border-[var(--border-default)]/30">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-[var(--status-error)] hover:bg-[var(--status-error-subtle)] transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Esci</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showProfileMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowProfileMenu(false)
            setShowNotifications(false)
          }}
        />
      )}
    </header>
  )
}
