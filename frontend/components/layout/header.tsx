'use client';

import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  User,
  CreditCard,
  LogOut,
  Check,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useCommandPaletteStore } from '@/stores/command-palette-store';
import { useThemeStore, type Theme } from '@/stores/theme-store';
import { Breadcrumb } from './breadcrumb';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'dark', label: 'Scuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

export function Header(): React.ReactElement {
  const { setMobileOpen } = useSidebarStore();
  const { toggle: toggleCommandPalette } = useCommandPaletteStore();
  const { theme, setTheme } = useThemeStore();
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    try {
      await fetch('/api/auth/demo-session', { method: 'DELETE' });
    } catch {
      // Ignore fetch errors, redirect anyway
    }
    router.push('/auth');
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
        aria-label="Apri menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb (desktop) */}
      <div className="hidden lg:flex flex-1 min-w-0">
        <Breadcrumb />
      </div>

      {/* Mobile: spacer */}
      <div className="flex-1 lg:hidden" />

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Search button */}
        <button
          onClick={toggleCommandPalette}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
            'border border-gray-200 dark:border-gray-700'
          )}
          aria-label="Cerca"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline text-gray-400 dark:text-gray-500">Cerca...</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </button>

        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Notifiche"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Menu utente"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">U</span>
              </div>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={cn(
                'z-50 min-w-[220px] rounded-xl p-1.5',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                'shadow-apple-lg',
                'animate-in fade-in slide-in-from-top-2 duration-200'
              )}
              align="end"
              sideOffset={8}
            >
              {/* User info */}
              <div className="px-3 py-2 mb-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Utente</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">utente@officina.it</p>
              </div>

              <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

              {/* Profile */}
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors"
                onSelect={() => router.push('/dashboard/settings')}
              >
                <User className="h-4 w-4" />
                Il mio profilo
              </DropdownMenu.Item>

              {/* Subscription */}
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors"
                onSelect={() => router.push('/dashboard/subscription')}
              >
                <CreditCard className="h-4 w-4" />
                Abbonamento
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

              {/* Theme sub-menu */}
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-gray-700">
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  Tema
                </DropdownMenu.SubTrigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    className={cn(
                      'z-50 min-w-[160px] rounded-xl p-1.5',
                      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                      'shadow-apple-lg',
                      'animate-in fade-in slide-in-from-left-2 duration-200'
                    )}
                    sideOffset={8}
                  >
                    {THEME_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <DropdownMenu.Item
                          key={option.value}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors"
                          onSelect={() => setTheme(option.value)}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </div>
                          {theme === option.value && <Check className="h-4 w-4 text-blue-600" />}
                        </DropdownMenu.Item>
                      );
                    })}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

              {/* Logout */}
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 outline-none focus:bg-red-50 dark:focus:bg-red-950/30 transition-colors"
                onSelect={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Esci
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

export default Header;
