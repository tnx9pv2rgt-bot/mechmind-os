import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accesso | MechMind OS',
  description: "Accedi al gestionale MechMind OS per officine automotive. Gestisci appuntamenti, clienti e fatture in un'unica piattaforma.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
