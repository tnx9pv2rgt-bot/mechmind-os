'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar,
  Users,
  Car,
  ClipboardCheck,
  Activity,
  Package,
  FileText,
  BarChart3,
  MapPin,
  Settings,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Prenotazioni', href: '/dashboard/bookings' },
  { name: 'Clienti', href: '/dashboard/customers' },
  { name: 'Veicoli', href: '/dashboard/vehicles' },
  { name: 'Ispezioni', href: '/dashboard/inspections', badge: 'NEW' },
  { name: 'OBD & ML', href: '/dashboard/obd', badge: 'NEW' },
  { name: 'Ricambi', href: '/dashboard/parts', badge: 'NEW' },
  { name: 'Fatture', href: '/dashboard/invoices' },
  { name: 'Location', href: '/dashboard/locations' },
  { name: 'Analytics', href: '/dashboard/analytics' },
  { name: 'Impostazioni', href: '/dashboard/settings' },
]

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true) // ← SEMPRE VISIBILE di default
  const [isPinned, setIsPinned] = useState(true)   // ← PIN mode
  const pathname = usePathname()
  const hideTimeout = useRef<NodeJS.Timeout>()

  // Mantieni visibile quando cambi pagina
  useEffect(() => {
    if (!isPinned) {
      setIsVisible(true)
    }
  }, [pathname, isPinned])

  const handleMouseLeave = () => {
    if (!isPinned) {
      // Delay prima di nascondere (2 secondi)
      hideTimeout.current = setTimeout(() => {
        setIsVisible(false)
      }, 2000)
    }
  }

  const handleMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current)
    }
    setIsVisible(true)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* macOS-style Menu Bar - SEMPRE VISIBILE */}
      <AnimatePresence>
        {isVisible && (
          <motion.header
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-black h-9 flex items-center shadow-2xl will-change-transform"
            style={{ transform: 'translateZ(0)' }}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
          >
            <div className="flex items-center justify-between w-full px-4">
              {/* Left: App Name */}
              <span className="text-white font-semibold text-sm">MechMind OS</span>

              {/* Center: Navigation */}
              <nav className="flex items-center h-full">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group relative flex items-center h-full px-4 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <span className="font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-apple-green rounded-full" />
                    )}
                  </Link>
                ))}
              </nav>

              {/* Right: Status Icons + Pin Toggle */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPinned(!isPinned)}
                  className={`p-1 transition-colors ${isPinned ? 'text-apple-blue' : 'text-gray-400 hover:text-white'}`}
                  title={isPinned ? "Sblocca navbar" : "Blocca navbar"}
                >
                  {isPinned ? '🔒' : '🔓'}
                </button>
                <button className="p-1 text-gray-400 hover:text-white transition-colors">
                  <Search className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-white transition-colors relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-apple-red rounded-full" />
                </button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-[10px] text-white font-medium">
                  OR
                </span>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Mobile Menu Button */}
      <button 
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-black text-white"
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Main Content - pt-10 per lasciare spazio alla navbar */}
      <main className="pt-10">{children}</main>
    </div>
  )
}
