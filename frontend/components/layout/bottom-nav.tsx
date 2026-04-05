'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Calendar,
  Users,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';

interface BottomNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: 'sidebar';
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'OdL', href: '/dashboard/work-orders', icon: Wrench },
  { name: 'Calendario', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Clienti', href: '/dashboard/customers', icon: Users },
  { name: 'Altro', href: '#', icon: Menu, action: 'sidebar' },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '#') return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav(): React.ReactElement {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebarStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[var(--surface-primary)] border-t border-[var(--border-default)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navigazione mobile"
    >
      <div className="flex items-center justify-around h-16">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          if (item.action === 'sidebar') {
            return (
              <button
                key={item.name}
                onClick={() => setMobileOpen(true)}
                className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-2 py-1"
                aria-label="Apri menu completo"
              >
                <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
                <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {item.name}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-2 py-1 transition-colors',
                active
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
