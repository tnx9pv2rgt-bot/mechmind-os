import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clienti | MechMind OS',
  description: "Gestisci l'anagrafica clienti della tua officina. Ricerca, filtri avanzati e storico interventi per ogni cliente.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
