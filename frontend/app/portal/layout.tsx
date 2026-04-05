'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalAuthService } from '@/lib/auth/portal-auth-client';
import { SkipLink } from '@/components/accessibility/SkipLink';
import { PortalCustomerProvider } from '@/components/portal/portal-customer-context';
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Car,
  Shield,
  Bell,
  MessageCircle,
  ClipboardCheck,
} from 'lucide-react';

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

const publicRoutes = ['/portal/login', '/portal/register', '/portal/reset-password', '/portal/invite'];

// ============================================
// NAV ITEMS
// ============================================

const navItems = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/bookings', label: 'Prenotazioni', icon: Calendar },
  { href: '/portal/repairs', label: 'Riparazioni', icon: Wrench },
  { href: '/portal/invoices', label: 'Fatture', icon: FileText },
  { href: '/portal/inspections', label: 'Ispezioni', icon: ClipboardCheck },
  { href: '/portal/documents', label: 'Documenti', icon: FolderOpen },
  { href: '/portal/maintenance', label: 'Manutenzione', icon: Wrench },
  { href: '/portal/warranty', label: 'Garanzie', icon: Shield },
  { href: '/portal/messages', label: 'Messaggi', icon: MessageCircle },
  { href: '/portal/notifications', label: 'Notifiche', icon: Bell },
  { href: '/portal/settings', label: 'Impostazioni', icon: Settings },
];

// ============================================
// LOADING COMPONENT
// ============================================

function LoadingScreen(): React.ReactElement {
  return (
    <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] flex items-center justify-center'>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='text-center'
      >
        <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center mx-auto mb-4'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-white border-t-transparent rounded-full'
          />
        </div>
        <p className='text-apple-gray dark:text-[var(--text-secondary)]'>Caricamento...</p>
      </motion.div>
    </div>
  );
}

// ============================================
// LAYOUT COMPONENT
// ============================================

export default function PortalRootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [isPublicPage, setIsPublicPage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      const auth = PortalAuthService.getInstance();
      auth.init();
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

      if (auth.isAuthenticated()) {
        if (isPublicRoute) {
          router.push('/portal/dashboard');
          return;
        }
        setIsPublicPage(false);
      } else {
        if (!isPublicRoute) {
          router.push('/portal/login');
          return;
        }
        setIsPublicPage(true);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = useCallback((): void => {
    const auth = PortalAuthService.getInstance();
    auth.logout();
    router.push('/portal/login');
  }, [router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Public pages: no nav chrome
  if (isPublicPage) {
    return (
      <AnimatePresence mode='wait'>
        <motion.div
          id='main-content'
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Authenticated pages: full layout with nav
  return (
    <PortalCustomerProvider>
      <SkipLink targetId='main-content' />
      <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)]'>
        {/* ===== HEADER ===== */}
        <header className='sticky top-0 z-50 bg-white/80 dark:bg-[var(--surface-tertiary)]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-[var(--border-default)]/50'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center justify-between h-16'>
              {/* Logo */}
              <Link
                href='/portal/dashboard'
                className='flex items-center gap-3 group'
              >
                <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center'>
                  <Car className='h-5 w-5 text-white' />
                </div>
                <span className='text-base font-semibold text-apple-dark dark:text-[var(--text-primary)] hidden sm:block'>
                  Portale Clienti
                </span>
              </Link>

              {/* Desktop Nav */}
              <nav className='hidden md:flex items-center gap-1'>
                {navItems.map(item => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-apple-blue/10 text-apple-blue'
                          : 'text-apple-gray hover:text-apple-dark dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--surface-elevated)]'
                      }`}
                    >
                      <item.icon className='h-4 w-4' />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Actions */}
              <div className='flex items-center gap-2'>
                <button
                  onClick={handleLogout}
                  className='hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-apple-gray hover:text-apple-red hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px]'
                >
                  <LogOut className='h-4 w-4' />
                  <span className='hidden lg:inline'>Esci</span>
                </button>

                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className='md:hidden p-2 rounded-lg text-apple-gray hover:text-apple-dark dark:hover:text-[var(--text-primary)] min-w-[44px] min-h-[44px] flex items-center justify-center'
                  aria-label={mobileMenuOpen ? 'Chiudi menu' : 'Apri menu'}
                >
                  {mobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className='md:hidden border-t border-gray-200/50 dark:border-[var(--border-default)]/50 bg-white dark:bg-[var(--surface-tertiary)]'
              >
                <nav className='px-4 py-3 space-y-1'>
                  {navItems.map(item => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                          isActive
                            ? 'bg-apple-blue/10 text-apple-blue'
                            : 'text-apple-gray hover:text-apple-dark dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--surface-elevated)]'
                        }`}
                      >
                        <item.icon className='h-5 w-5' />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={handleLogout}
                    className='flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-apple-red hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full min-h-[44px]'
                  >
                    <LogOut className='h-5 w-5' />
                    <span>Esci</span>
                  </button>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* ===== MAIN CONTENT ===== */}
        <AnimatePresence mode='wait'>
          <motion.main
            id='main-content'
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'
          >
            {children}
          </motion.main>
        </AnimatePresence>

        {/* ===== FOOTER ===== */}
        <footer className='border-t border-gray-200/50 dark:border-[var(--border-default)]/50 mt-auto'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
            <div className='flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-apple-gray dark:text-[var(--text-secondary)]'>
              <p>Portale Clienti MechMind OS</p>
              <a
                href='mailto:supporto@mechmind.it'
                className='text-apple-blue hover:underline min-h-[44px] flex items-center'
              >
                Hai bisogno di aiuto? Contattaci
              </a>
            </div>
          </div>
        </footer>

        {/* ===== MOBILE BOTTOM NAV ===== */}
        <nav className='md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[var(--surface-tertiary)]/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-[var(--border-default)]/50 z-40 safe-area-bottom'>
          <div className='flex items-center justify-around py-2'>
            {navItems.slice(0, 5).map(item => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-[44px] min-h-[44px] justify-center ${
                    isActive ? 'text-apple-blue' : 'text-apple-gray'
                  }`}
                >
                  <item.icon className='h-5 w-5' />
                  <span className='text-[10px] font-medium'>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </PortalCustomerProvider>
  );
}
