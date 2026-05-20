'use client';

import { useEffect } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { ToastProvider } from '@/components/ui/use-toast';
import { NotificationProvider } from '@/lib/notification-context';
import { useThemeStore } from '@/stores/theme-store';

function ThemeSync(): null {
  const theme = useThemeStore(s => s.theme);
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);
  return null;
}

interface ProvidersProps {
  children: React.ReactNode;
  nonce?: string;
}

export function Providers({ children, nonce }: ProvidersProps) {
  return (
    <ToastProvider>
      <NotificationProvider
        apiUrl='/api'
        enableToasts={false}
        enableRealtime={false}
        autoReconnect={false}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem={true}
          disableTransitionOnChange
        >
          <ThemeSync />
          {children}
        </ThemeProvider>
      </NotificationProvider>
    </ToastProvider>
  );
}
