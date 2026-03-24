'use client';

import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { BottomNav } from './bottom-nav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps): React.ReactElement {
  const { expanded } = useSidebarStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area: offset by sidebar width on desktop */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-[margin-left] duration-300 ease-apple',
          'lg:ml-60',
          !expanded && 'lg:ml-16'
        )}
      >
        {/* Header */}
        <Header />

        {/* Main content */}
        <main
          id="main-content"
          className="flex-1 p-4 md:p-6 max-w-full overflow-y-auto pb-20 lg:pb-6"
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
