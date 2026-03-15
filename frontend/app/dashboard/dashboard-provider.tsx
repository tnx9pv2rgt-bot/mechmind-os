'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SkipLink } from '@/components/accessibility/SkipLink';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Prenotazioni', href: '/dashboard/bookings' },
  { name: 'Clienti', href: '/dashboard/customers' },
  { name: 'Veicoli', href: '/dashboard/vehicles' },
  { name: 'Ispezioni', href: '/dashboard/inspections', badge: 'NEW' },
  { name: 'OBD & ML', href: '/dashboard/obd', badge: 'NEW' },
  { name: 'Ricambi', href: '/dashboard/parts', badge: 'NEW' },
  { name: 'Ordini Lavoro', href: '/dashboard/work-orders' },
  { name: 'Fatture', href: '/dashboard/invoices' },
  { name: 'Location', href: '/dashboard/locations' },
  { name: 'Analytics', href: '/dashboard/analytics' },
  { name: 'Impostazioni', href: '/dashboard/settings' },
];

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const hideTimeout = useRef<NodeJS.Timeout>();

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    if (!isPinned) {
      setIsVisible(true);
    }
  }, [pathname, isPinned]);

  const handleMouseLeave = () => {
    if (!isPinned) {
      hideTimeout.current = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    }
  };

  const handleMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }
    setIsVisible(true);
  };

  return (
    <div className='min-h-screen bg-[#f4f4f4] dark:bg-[#212121] transition-colors'>
      <SkipLink targetId='main-content' />
      {/* Desktop Menu Bar */}
      <AnimatePresence>
        {isVisible && (
          <header
            className='bg-[#0d0d0d] dark:bg-[#0d0d0d] h-9 hidden md:flex items-center shadow-2xl'
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
          >
            <div className='flex items-center justify-between w-full px-4'>
              <span className='text-white font-semibold text-sm'>MechMind OS</span>

              <nav className='flex items-center h-full'>
                {navigation.map(item => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group relative flex items-center h-full px-4 text-sm transition-all cursor-pointer ${
                        isActive
                          ? 'text-white bg-white/15'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className='font-medium'>{item.name}</span>
                      {item.badge && (
                        <span className='absolute top-2 right-2 w-1.5 h-1.5 bg-apple-green rounded-full' />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2 bg-white/10 rounded-full px-2 py-1'>
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className={`p-1 transition-colors ${isPinned ? 'text-apple-blue' : 'text-gray-400 hover:text-white'}`}
                  title={isPinned ? 'Sblocca navbar' : 'Blocca navbar'}
                >
                  {isPinned ? '📌' : '📍'}
                </button>
                <button className='p-1 text-gray-400 hover:text-white transition-colors'>
                  <Search className='h-4 w-4' />
                </button>
                <button className='p-1 text-gray-400 hover:text-white transition-colors relative'>
                  <Bell className='h-4 w-4' />
                  <span className='absolute top-0 right-0 w-1.5 h-1.5 bg-apple-red rounded-full' />
                </button>
                <div className='w-px h-4 bg-white/20 mx-1' />
                <span className='w-5 h-5 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-[10px] text-white font-medium'>
                  OR
                </span>
              </div>
            </div>
          </header>
        )}
      </AnimatePresence>

      {/* Mobile Hamburger Button */}
      <button
        className='fixed top-3 left-3 z-[10000] md:hidden p-2.5 rounded-xl bg-black text-white shadow-lg'
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? 'Chiudi menu' : 'Apri menu'}
      >
        {mobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
      </button>

      {/* Mobile Slide-out Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm md:hidden'
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.nav
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className='fixed top-0 left-0 bottom-0 z-[9999] w-[280px] bg-black md:hidden overflow-y-auto'
            >
              <div className='pt-16 pb-6 px-4'>
                <div className='flex items-center justify-between mb-6 px-3'>
                  <p className='text-white font-bold text-lg'>MechMind OS</p>
                  <ThemeToggle />
                </div>
                <div className='space-y-1'>
                  {navigation.map(item => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-colors ${
                          isActive
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className='text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-apple-green text-white'>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main id='main-content'>{children}</main>
    </div>
  );
}
