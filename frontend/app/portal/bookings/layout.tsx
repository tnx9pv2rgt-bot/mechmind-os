import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'I Miei Appuntamenti | MechMind OS',
  description: "Visualizza e gestisci le tue prenotazioni presso l'officina. Prenota un appuntamento online in pochi click.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
