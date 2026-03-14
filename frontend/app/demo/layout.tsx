import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demo | MechMind OS',
  description: 'Prova la demo interattiva di MechMind OS. Esplora tutte le funzionalità del gestionale per officine automotive.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
