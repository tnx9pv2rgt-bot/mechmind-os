import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fatturazione | MechMind OS',
  description: 'Gestione della fatturazione e dei pagamenti per il tuo abbonamento MechMind OS.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
