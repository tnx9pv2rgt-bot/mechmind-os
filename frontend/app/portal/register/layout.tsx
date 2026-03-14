import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Registrazione | MechMind OS',
  description: 'Crea il tuo account sul portale clienti MechMind OS. Registrati per gestire i tuoi veicoli online.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
