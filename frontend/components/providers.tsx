'use client'

import { ThemeProvider } from 'next-themes'
import { TRPCProvider, TRPCErrorBoundary } from '@/lib/trpc-provider'
import { ToastProvider } from '@/components/ui/use-toast'
import { NotificationProvider } from '@/lib/notification-context'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      <TRPCProvider>
        <TRPCErrorBoundary
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
                <h2 className="text-lg font-semibold text-red-800 mb-2">
                  Application Error
                </h2>
                <p className="text-red-600 mb-4">
                  Unable to connect to the server. Please check your internet 
                  connection and try again.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Reload Application
                </button>
              </div>
            </div>
          }
        >
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
        </TRPCErrorBoundary>
      </TRPCProvider>
    </ToastProvider>
  )
}
