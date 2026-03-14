import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Abbonamento | MechMind OS',
  description: 'Gestisci il tuo abbonamento MechMind OS. Visualizza piano attuale, limiti di utilizzo e opzioni di upgrade.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
