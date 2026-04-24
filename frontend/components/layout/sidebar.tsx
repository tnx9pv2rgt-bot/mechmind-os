'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
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
  Zap,
  Sparkles,
  Palette,
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  User,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useCommandPaletteStore } from '@/stores/command-palette-store';
import { useThemeStore, type Theme, type SidebarBehavior, type SidebarTheme } from '@/stores/theme-store';

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
      { name: 'Automazioni', href: '/dashboard/workflows', icon: Zap },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Configurazione',
    items: [
      { name: 'Sedi', href: '/dashboard/locations', icon: MapPin },
      { name: 'Abbonamento', href: '/dashboard/subscription', icon: CreditCard },
      { name: 'Aspetto', href: '/dashboard/settings/appearance', icon: Palette },
      { name: 'Impostazioni', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'dark', label: 'Scuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolve sidebar theme to actual light/dark class overrides */
function getSidebarThemeStyles(sidebarTheme: SidebarTheme, resolvedAppTheme: string | undefined): Record<string, string> | undefined {
  if (sidebarTheme === 'follow') return undefined; // Use default CSS vars

  const isDarkSidebar = sidebarTheme === 'dark';
  const isAppDark = resolvedAppTheme === 'dark';

  // If sidebar theme matches app theme, no override needed
  if ((isDarkSidebar && isAppDark) || (!isDarkSidebar && !isAppDark)) return undefined;

  if (isDarkSidebar) {
    return {
      '--sidebar-bg': '#171717',
      '--sidebar-text': '#ececec',
      '--sidebar-text-[var(--text-secondary)]': '#b4b4b4',
      '--sidebar-hover': '#2f2f2f',
      '--sidebar-border': 'hsla(0, 0%, 100%, 0.1)',
      '--sidebar-active': '#2f2f2f',
    };
  }

  return {
    '--sidebar-bg': '#f9f9f9',
    '--sidebar-text': '#0d0d0d',
    '--sidebar-text-[var(--text-secondary)]': '#6e6e6e',
    '--sidebar-hover': '#ececec',
    '--sidebar-border': '#e5e5e5',
    '--sidebar-active': '#ececec',
  };
}

export function Sidebar(): React.ReactElement {
  const { expanded, mobileOpen, toggle, setMobileOpen } = useSidebarStore();
  const { toggle: toggleCommandPalette } = useCommandPaletteStore();
  const { theme, setTheme, sidebarBehavior, sidebarTheme, setSidebarBehavior } = useThemeStore();
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  // Auto-hide state
  const [autoVisible, setAutoVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Resolve effective expanded state based on behavior setting
  const isAutoMode = sidebarBehavior === 'auto';
  const effectiveExpanded = isAutoMode
    ? true // When auto overlay is visible, show full sidebar
    : sidebarBehavior === 'collapsed'
      ? false
      : sidebarBehavior === 'expanded'
        ? true
        : expanded; // fallback

  // Resolve sidebar theme (reactive via next-themes)
  const themeOverrides = getSidebarThemeStyles(sidebarTheme, resolvedTheme);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
    if (isAutoMode) setAutoVisible(false);
  }, [pathname, setMobileOpen, isAutoMode]);

  // Keyboard shortcuts: Escape to close, Cmd+\ to toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
      // Cmd+\ (or Ctrl+\ on Windows) to toggle sidebar
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isAutoMode) {
          setAutoVisible(prev => !prev);
        } else {
          setSidebarBehavior(effectiveExpanded ? 'collapsed' : 'expanded');
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen, toggle, isAutoMode]);

  // Auto-hide: mouse enter/leave handlers
  const handleAutoEnter = useCallback((): void => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
    setAutoVisible(true);
  }, []);

  const handleAutoLeave = useCallback((): void => {
    hideTimeoutRef.current = setTimeout(() => {
      setAutoVisible(false);
    }, 300); // 300ms delay to prevent flicker (Linear pattern)
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  async function handleLogout(): Promise<void> {
    try {
      await fetch('/api/auth/demo-session', { method: 'DELETE' });
    } catch {
      // Ignore fetch errors, redirect anyway
    }
    router.push('/auth');
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-14 px-4 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-[var(--text-on-brand)]" />
          </div>
          <span
            className={cn(
              'font-semibold text-base text-[var(--sidebar-text)] whitespace-nowrap transition-opacity duration-200',
              effectiveExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}
          >
            MechMind
          </span>
        </Link>

        {/* Close button for mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1.5 rounded-lg text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-hover)] lg:hidden"
          aria-label="Chiudi menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search button */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <button
          onClick={toggleCommandPalette}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm transition-colors',
            'text-[var(--sidebar-text-secondary)]',
            'hover:bg-[var(--sidebar-hover)]',
            !effectiveExpanded && 'justify-center px-0'
          )}
          aria-label="Cerca"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              'whitespace-nowrap transition-opacity duration-200',
              effectiveExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}
          >
            Cerca...
          </span>
          {effectiveExpanded && (
            <kbd className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono text-[var(--text-tertiary)] bg-[var(--surface-hover)] rounded">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 scrollbar-hide" aria-label="Navigazione principale">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {/* Group label */}
            <p
              className={cn(
                'text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)] mb-1.5 transition-opacity duration-200',
                effectiveExpanded ? 'px-3 opacity-100' : 'px-0 text-center opacity-0 h-0 overflow-hidden'
              )}
            >
              {group.label}
            </p>

            {!effectiveExpanded && (
              <div className="w-6 h-px bg-[var(--sidebar-border)] mx-auto mb-2" />
            )}

            <ul className="space-y-0.5" role="list">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text)]'
                          : 'text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-hover)]',
                        !effectiveExpanded && 'justify-center px-0'
                      )}
                      title={!effectiveExpanded ? item.name : undefined}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-[var(--sidebar-text)]' : '')} />
                      <span
                        className={cn(
                          'whitespace-nowrap transition-opacity duration-200',
                          effectiveExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
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

      {/* Bottom section: actions + user */}
      <div className="shrink-0 border-t border-[var(--sidebar-border)] p-3 space-y-0.5">
        {/* Notification button */}
        <button
          className={cn(
            'relative flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-hover)] transition-colors',
            !effectiveExpanded && 'justify-center px-0'
          )}
          aria-label="Notifiche"
        >
          <Bell className="h-[18px] w-[18px] shrink-0" />
          <span className="absolute top-1.5 left-7 w-2 h-2 bg-[var(--status-error-subtle)]0 rounded-full" />
          <span
            className={cn(
              'whitespace-nowrap transition-opacity duration-200',
              effectiveExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}
          >
            Notifiche
          </span>
        </button>

        {/* Theme dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-hover)] transition-colors',
                !effectiveExpanded && 'justify-center px-0'
              )}
              aria-label="Tema"
            >
              {theme === 'dark' ? (
                <Moon className="h-[18px] w-[18px] shrink-0" />
              ) : theme === 'light' ? (
                <Sun className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <Monitor className="h-[18px] w-[18px] shrink-0" />
              )}
              <span
                className={cn(
                  'whitespace-nowrap transition-opacity duration-200',
                  effectiveExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                )}
              >
                Tema
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={cn(
                'z-50 min-w-[160px] rounded-2xl p-1.5',
                'bg-[var(--surface-elevated)] border border-[var(--border-default)]',
                'shadow-lg',
                'animate-in fade-in slide-in-from-left-2 duration-200'
              )}
              side="right"
              align="end"
              sideOffset={8}
            >
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <DropdownMenu.Item
                    key={option.value}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-[var(--text-primary)] rounded-xl cursor-pointer hover:bg-[var(--surface-hover)] outline-none focus:bg-[var(--surface-hover)] transition-colors"
                    onSelect={() => setTheme(option.value)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                    {theme === option.value && <Check className="h-4 w-4 text-[var(--brand)]" />}
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* User + logout */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-[var(--sidebar-hover)] transition-colors',
                !effectiveExpanded && 'justify-center px-0'
              )}
              aria-label="Menu utente"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center shrink-0">
                <span className="text-[var(--text-primary)] text-xs font-semibold">U</span>
              </div>
              <div
                className={cn(
                  'min-w-0 text-left transition-opacity duration-200',
                  effectiveExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                )}
              >
                <p className="text-sm font-medium text-[var(--sidebar-text)] truncate">Utente</p>
                <p className="text-xs text-[var(--sidebar-text-secondary)] truncate">Officina</p>
              </div>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={cn(
                'z-50 min-w-[200px] rounded-2xl p-1.5',
                'bg-[var(--surface-elevated)] border border-[var(--border-default)]',
                'shadow-lg',
                'animate-in fade-in slide-in-from-left-2 duration-200'
              )}
              side="right"
              align="end"
              sideOffset={8}
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] rounded-xl cursor-pointer hover:bg-[var(--surface-hover)] outline-none focus:bg-[var(--surface-hover)] transition-colors"
                onSelect={() => router.push('/dashboard/settings')}
              >
                <User className="h-4 w-4" />
                Il mio profilo
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] rounded-xl cursor-pointer hover:bg-[var(--surface-hover)] outline-none focus:bg-[var(--surface-hover)] transition-colors"
                onSelect={() => router.push('/dashboard/subscription')}
              >
                <CreditCard className="h-4 w-4" />
                Abbonamento
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-[var(--border-default)] my-1" />

              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--status-error)] rounded-xl cursor-pointer hover:bg-[var(--status-error-subtle)] dark:hover:bg-[var(--status-error)]/40/30 outline-none focus:bg-[var(--status-error-subtle)] dark:focus:bg-[var(--status-error)]/40/30 transition-colors"
                onSelect={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Esci
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Collapse toggle (desktop only, not shown in auto mode) */}
        {!isAutoMode && (
          <button
            onClick={() => setSidebarBehavior(effectiveExpanded ? 'collapsed' : 'expanded')}
            className={cn(
              'hidden lg:flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-[var(--text-tertiary)] hover:bg-[var(--sidebar-hover)] transition-colors',
              !effectiveExpanded && 'justify-center px-0'
            )}
            aria-label={effectiveExpanded ? 'Comprimi menu' : 'Espandi menu'}
          >
            {effectiveExpanded ? (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Comprimi</span>
              </>
            ) : (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            )}
          </button>
        )}

        {/* Keyboard shortcut hint */}
        {effectiveExpanded && (
          <div className="hidden lg:flex items-center justify-center pt-1">
            <kbd className="text-[10px] text-[var(--text-tertiary)] font-mono opacity-50">
              &#8984;\  {isAutoMode ? 'mostra/nascondi' : 'comprimi/espandi'}
            </kbd>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--surface-overlay)] backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar (overlay drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--sidebar-bg)] shadow-xl lg:hidden',
          'transform transition-transform duration-300 ease-apple',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={themeOverrides as React.CSSProperties}
        aria-label="Menu di navigazione"
      >
        {sidebarContent}
      </aside>

      {/* Desktop: Auto-hide mode */}
      {isAutoMode && (
        <>
          {/* Invisible trigger zone on left edge (6px wide) */}
          <div
            ref={triggerRef}
            className="hidden lg:block fixed inset-y-0 left-0 w-1.5 z-30"
            onMouseEnter={handleAutoEnter}
            aria-hidden="true"
          />

          {/* Overlay backdrop when auto-sidebar is visible */}
          {autoVisible && (
            <div
              className="hidden lg:block fixed inset-0 z-30 bg-[var(--surface-primary)]/20 backdrop-blur-[2px]"
              onClick={() => setAutoVisible(false)}
              onMouseEnter={handleAutoLeave}
              aria-hidden="true"
            />
          )}

          {/* Auto-hide sidebar (overlay, doesn't push content) */}
          <aside
            ref={sidebarRef}
            className={cn(
              'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-60',
              'bg-[var(--sidebar-bg)] shadow-2xl',
              'transform transition-transform duration-300 ease-apple',
              autoVisible ? 'translate-x-0' : '-translate-x-full'
            )}
            style={themeOverrides as React.CSSProperties}
            onMouseEnter={handleAutoEnter}
            onMouseLeave={handleAutoLeave}
            aria-label="Menu di navigazione"
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Desktop: Normal sidebar (expanded/collapsed) */}
      {!isAutoMode && (
        <aside
          className={cn(
            'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30',
            'bg-[var(--sidebar-bg)]',
            'transition-[width] duration-300 ease-apple',
            effectiveExpanded ? 'lg:w-60' : 'lg:w-16'
          )}
          style={themeOverrides as React.CSSProperties}
          aria-label="Menu di navigazione"
        >
          {sidebarContent}
        </aside>
      )}
    </>
  );
}

export default Sidebar;
