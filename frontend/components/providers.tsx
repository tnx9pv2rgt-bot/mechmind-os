'use client'

import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/components/ui/use-toast'
import { NotificationProvider } from '@/lib/notification-context'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      <NotificationProvider
        apiUrl="/api"
        enableToasts={false}
        enableRealtime={false}
        autoReconnect={false}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </NotificationProvider>
    </ToastProvider>
  )
}
