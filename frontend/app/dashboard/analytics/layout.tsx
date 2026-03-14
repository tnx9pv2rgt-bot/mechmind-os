import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics | MechMind OS',
  description: 'Dashboard analitica completa per monitorare le performance della tua officina con grafici e metriche in tempo reale.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
