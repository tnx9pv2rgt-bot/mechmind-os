'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Calendar,
  FileText,
  ClipboardCheck,
  CalendarCheck,
  Users,
  Car,
  Settings,
  Receipt,
  Package,
  Megaphone,
  MessageSquare,
  Activity,
  BookOpen,
  Shield,
  BarChart3,
  MapPin,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Recycle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operativit\u00e0',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Ordini di Lavoro', href: '/dashboard/work-orders', icon: Wrench },
      { name: 'Calendario', href: '/dashboard/calendar', icon: Calendar },
      { name: 'Preventivi', href: '/dashboard/estimates', icon: FileText },
      { name: 'Ispezioni', href: '/dashboard/inspections', icon: ClipboardCheck },
      { name: 'Prenotazioni', href: '/dashboard/bookings', icon: CalendarCheck },
    ],
  },
  {
    label: 'Clienti',
    items: [
      { name: 'Clienti', href: '/dashboard/customers', icon: Users },
      { name: 'Veicoli', href: '/dashboard/vehicles', icon: Car },
      { name: 'Manutenzione', href: '/dashboard/maintenance', icon: Settings },
    ],
  },
  {
    label: 'Finanze',
    items: [
      { name: 'Fatture', href: '/dashboard/invoices', icon: Receipt },
      { name: 'Ricambi', href: '/dashboard/parts', icon: Package },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Campagne', href: '/dashboard/marketing', icon: Megaphone },
      { name: 'Messaggistica', href: '/dashboard/messaging', icon: MessageSquare },
    ],
  },
  {
    label: 'Strumenti',
    items: [
      { name: 'OBD Diagnostica', href: '/dashboard/obd', icon: Activity },
      { name: 'Lavori Standard', href: '/dashboard/canned-jobs', icon: BookOpen },
      { name: 'Garanzie', href: '/dashboard/warranty', icon: Shield },
      { name: 'Rifiuti (RENTRI)', href: '/dashboard/rentri', icon: Recycle },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Configurazione',
    items: [
      { name: 'Sedi', href: '/dashboard/locations', icon: MapPin },
      { name: 'Abbonamento', href: '/dashboard/subscription', icon: CreditCard },
      { name: 'Impostazioni', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar(): React.ReactElement {
  const { expanded, mobileOpen, toggle, setMobileOpen } = useSidebarStore();
  const pathname = usePathname();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span
            className={cn(
              'font-semibold text-lg text-gray-900 dark:text-white whitespace-nowrap transition-opacity duration-200',
              expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}
          >
            MechMind
          </span>
        </Link>

        {/* Close button for mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          aria-label="Chiudi menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide" aria-label="Navigazione principale">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            {/* Group label */}
            <p
              className={cn(
                'text-xs uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-2 transition-opacity duration-200',
                expanded ? 'px-3 opacity-100' : 'px-0 text-center opacity-0 h-0 overflow-hidden'
              )}
            >
              {group.label}
            </p>

            {!expanded && (
              <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 mx-auto mb-2" />
            )}

            <ul className="space-y-1" role="list">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-l-2 border-blue-600'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-transparent',
                        !expanded && 'justify-center px-0'
                      )}
                      title={!expanded ? item.name : undefined}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400')} />
                      <span
                        className={cn(
                          'whitespace-nowrap transition-opacity duration-200',
                          expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                        )}
                      >
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom section: user avatar + collapse toggle */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
        {/* User info */}
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2 mb-2 rounded-lg',
            expanded ? '' : 'justify-center px-0'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">U</span>
          </div>
          <div
            className={cn(
              'min-w-0 transition-opacity duration-200',
              expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Utente</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Officina</p>
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggle}
          className={cn(
            'hidden lg:flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
            !expanded && 'justify-center px-0'
          )}
          aria-label={expanded ? 'Comprimi menu' : 'Espandi menu'}
        >
          {expanded ? (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Comprimi</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar (overlay drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-gray-900 shadow-xl lg:hidden',
          'transform transition-transform duration-300 ease-apple',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Menu di navigazione"
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30',
          'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700',
          'transition-[width] duration-300 ease-apple',
          expanded ? 'lg:w-60' : 'lg:w-16'
        )}
        aria-label="Menu di navigazione"
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default Sidebar;
