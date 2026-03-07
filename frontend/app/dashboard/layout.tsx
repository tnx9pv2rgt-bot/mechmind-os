import { Metadata } from 'next'
import { DashboardProvider } from './dashboard-provider'

export const metadata: Metadata = {
  title: 'MechMind OS - Dashboard',
  description: 'Gestionale automotive professionale',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      {children}
    </DashboardProvider>
  )
}
