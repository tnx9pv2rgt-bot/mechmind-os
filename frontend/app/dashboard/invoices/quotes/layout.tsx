import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Preventivi | MechMind OS',
  description: 'Crea e gestisci i preventivi per i tuoi clienti. Modelli personalizzabili con calcolo automatico dei costi.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
