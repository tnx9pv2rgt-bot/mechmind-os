import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manutenzione | MechMind OS',
  description: 'Pianifica e monitora le manutenzioni programmate dei veicoli. Scadenze, promemoria e storico interventi.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
