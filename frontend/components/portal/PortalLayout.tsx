'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Wrench,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Car,
  User,
  ChevronRight,
  Bell,
  MessageCircle,
} from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { Customer } from '@/lib/types/portal';
import { usePortalCustomer } from './portal-customer-context';

// ============================================
// NAVIGATION ITEMS
// ============================================

const navigation = [
  { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
  { name: 'Prenotazioni', href: '/portal/bookings', icon: Calendar },
  { name: 'Riparazioni', href: '/portal/repairs', icon: Car },
  { name: 'Fatture', href: '/portal/invoices', icon: FileText },
  { name: 'Ispezioni', href: '/portal/inspections', icon: ClipboardCheck },
  { name: 'Documenti', href: '/portal/documents', icon: FolderOpen },
  { name: 'Manutenzione', href: '/portal/maintenance', icon: Wrench },
  { name: 'Garanzie', href: '/portal/warranty', icon: Shield },
  { name: 'Messaggi', href: '/portal/messages', icon: MessageCircle },
  { name: 'Notifiche', href: '/portal/notifications', icon: Bell },
  { name: 'Impostazioni', href: '/portal/settings', icon: Settings },
];

// ============================================
// PROPS
// ============================================

interface PortalLayoutProps {
  children: React.ReactNode;
  customer?: Customer;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PortalLayout({ children, customer: customerProp }: PortalLayoutProps) {
  const { customer: contextCustomer } = usePortalCustomer();
  const customer = customerProp ?? contextCustomer;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('portal_user');
    }
    router.push('/portal/login');
  };

  const customerInitials = customer
    ? `${customer.firstName[0]}${customer.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <div className='min-h-screen bg-[#f5f5f7] dark:bg-[#212121]'>
      {/* Mobile Header */}
      <div className='lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#212121]/90 backdrop-blur-apple border-b border-apple-border/50 dark:border-[#424242]/50 h-14'>
        <div className='flex items-center justify-between h-full px-4'>
          <button
            onClick={() => setSidebarOpen(true)}
            className='p-2 -ml-2 rounded-xl hover:bg-apple-light-gray dark:hover:bg-[#353535] transition-colors'
          >
            <Menu className='h-5 w-5 text-apple-dark dark:text-[#ececec]' />
          </button>

          <Link
            href='/portal/dashboard'
            className='font-semibold text-apple-dark dark:text-[#ececec]'
          >
            MechMind Portal
          </Link>

          <div className='w-8 h-8 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white text-xs font-medium'>
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
            className='fixed inset-0 bg-black/40 z-50 lg:hidden'
            role='button'
            tabIndex={0}
            aria-label='Chiudi menu'
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                e.preventDefault();
                setSidebarOpen(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white dark:bg-[#2f2f2f] border-r border-apple-border/50 dark:border-[#424242]/50
          lg:translate-x-0 lg:static lg:h-screen
          ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        `}
        initial={false}
        animate={{
          x: isMobile ? (sidebarOpen ? 0 : '-100%') : 0,
          width: 280,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className='flex flex-col h-full'>
          {/* Sidebar Header */}
          <div className='flex items-center justify-between p-5 border-b border-apple-border/30 dark:border-[#424242]/30'>
            <Link href='/portal/dashboard' className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center'>
                <Car className='h-5 w-5 text-white' />
              </div>
              <div>
                <p className='font-semibold text-apple-dark dark:text-[#ececec] leading-tight'>
                  MechMind
                </p>
                <p className='text-xs text-apple-gray dark:text-[#636366]'>Customer Portal</p>
              </div>
            </Link>

            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className='p-2 rounded-xl hover:bg-apple-light-gray dark:hover:bg-[#353535] transition-colors'
              >
                <X className='h-5 w-5 text-apple-dark dark:text-[#ececec]' />
              </button>
            )}
          </div>

          {/* Customer Info */}
          {customer && (
            <div className='p-5 border-b border-apple-border/30 dark:border-[#424242]/30'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white font-semibold'>
                  {customerInitials}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-medium text-apple-dark dark:text-[#ececec] truncate'>
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className='text-xs text-apple-gray dark:text-[#636366] truncate'>
                    {customer.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className='flex-1 overflow-y-auto py-4 px-3'>
            <ul className='space-y-1'>
              {navigation.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                        ${
                          isActive
                            ? 'bg-apple-blue text-white shadow-apple'
                            : 'text-apple-dark dark:text-[#ececec] hover:bg-apple-light-gray dark:hover:bg-[#353535]'
                        }
                      `}
                    >
                      <Icon className='h-5 w-5 flex-shrink-0' />
                      <span className='flex-1'>{item.name}</span>
                      {isActive && <ChevronRight className='h-4 w-4 opacity-50' />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className='p-4 border-t border-apple-border/30 dark:border-[#424242]/30'>
            <button
              onClick={handleLogout}
              className='flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-apple-red hover:bg-red-50 dark:hover:bg-red-900/20 transition-all'
            >
              <LogOut className='h-5 w-5' />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        className={`
        lg:ml-0 min-h-screen transition-all duration-300
        ${isMobile ? 'pt-14' : ''}
      `}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className='fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#212121]/90 backdrop-blur-apple border-t border-apple-border/50 dark:border-[#424242]/50 px-2 pb-safe'>
          <div className='flex items-center justify-around h-16'>
            {navigation.slice(0, 5).map(item => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all
                    ${isActive ? 'text-apple-blue' : 'text-apple-gray'}
                  `}
                >
                  <Icon className='h-5 w-5' />
                  <span className='text-[10px] font-medium'>{item.name.split(' ')[0]}</span>
                  {isActive && (
                    <div className='absolute bottom-1 w-1 h-1 rounded-full bg-apple-blue' />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

// ============================================
// PORTAL PAGE WRAPPER
// ============================================

interface PortalPageWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  customer?: Customer;
  action?: React.ReactNode;
}

export function PortalPageWrapper({
  children,
  title,
  subtitle,
  customer,
  action,
}: PortalPageWrapperProps) {
  return (
    <PortalLayout customer={customer}>
      <div className='p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'>
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6 sm:mb-8'
        >
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-2xl sm:text-3xl font-semibold text-apple-dark dark:text-[#ececec]'>
                {title}
              </h1>
              {subtitle && <p className='text-apple-gray dark:text-[#636366] mt-1'>{subtitle}</p>}
            </div>
            {action && <div className='flex-shrink-0'>{action}</div>}
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
  );
}
