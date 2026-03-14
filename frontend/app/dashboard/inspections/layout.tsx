import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ispezioni | MechMind OS',
  description: 'Gestisci le ispezioni digitali dei veicoli. Checklist personalizzabili, foto e report dettagliati per ogni controllo.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
