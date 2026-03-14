import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fatturazione | MechMind OS',
  description: 'Gestisci la fatturazione, i pagamenti e lo storico delle transazioni del tuo abbonamento MechMind OS.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
