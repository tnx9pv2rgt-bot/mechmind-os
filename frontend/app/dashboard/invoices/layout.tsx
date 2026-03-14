import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fatture | MechMind OS',
  description: 'Gestisci fatture e documenti fiscali della tua officina. Emissione, invio e monitoraggio dei pagamenti.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
