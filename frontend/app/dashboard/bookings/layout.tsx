import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Appuntamenti | MechMind OS',
  description: 'Gestisci le prenotazioni e gli appuntamenti della tua officina. Calendario, disponibilità e conferme automatiche.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
