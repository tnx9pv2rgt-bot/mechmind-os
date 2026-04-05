'use client';

import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useThemeStore } from '@/stores/theme-store';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps): React.ReactElement {
  const { expanded, setMobileOpen } = useSidebarStore();
  const { sidebarBehavior } = useThemeStore();

  const isAutoMode = sidebarBehavior === 'auto';
  const isCollapsedMode = sidebarBehavior === 'collapsed';

  return (
    <div className="min-h-screen bg-[var(--surface-tertiary)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area: offset by sidebar width on desktop */}
      <div
        className={cn(
          'flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-[margin-left] duration-300 ease-apple',
          // Auto mode: no margin (sidebar is overlay)
          isAutoMode && 'lg:ml-0',
          // Collapsed mode: 64px margin
          isCollapsedMode && 'lg:ml-16',
          // Expanded mode (or default): 240px margin
          !isAutoMode && !isCollapsedMode && 'lg:ml-60',
          // Legacy toggle support when behavior is "expanded"
          !isAutoMode && !isCollapsedMode && !expanded && 'lg:ml-16'
        )}
      >
        {/* Mobile-only hamburger button */}
        <div className="sticky top-0 z-20 flex items-center h-12 px-4 lg:hidden bg-[var(--surface-primary)]">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            aria-label="Apri menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Main content */}
        <main
          id="main-content"
          className="flex-1 p-[var(--density-page-padding)] max-w-full overflow-y-auto pb-20 lg:pb-6"
          style={{ maxWidth: 'var(--content-max-width)' }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}

export default DashboardLayout;
