import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sedi | MechMind OS',
  description: 'Gestisci le sedi e i punti operativi della tua officina. Configurazione orari, servizi e personale per sede.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
