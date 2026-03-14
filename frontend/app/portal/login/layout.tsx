import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accesso Portale Clienti | MechMind OS',
  description: 'Accedi al portale clienti MechMind OS. Controlla lo stato delle riparazioni e prenota appuntamenti online.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
