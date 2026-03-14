import { Metadata } from 'next'
import { cookies } from 'next/headers'
import { DashboardProviders } from '@/components/dashboard/DashboardProviders'
import { DashboardProvider } from './dashboard-provider'

export const metadata: Metadata = {
  title: 'Dashboard | MechMind OS',
  description: 'Gestionale automotive professionale per officine. Gestisci clienti, appuntamenti, fatture e ispezioni.',
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('demo_session')?.value === '1'

  return (
    <DashboardProviders initialIsDemo={isDemo}>
      <DashboardProvider>
        {children}
      </DashboardProvider>
    </DashboardProviders>
  )
}
