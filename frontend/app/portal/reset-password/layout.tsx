import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reimposta Password | Portale Clienti MechMind',
  description: 'Reimposta la password del tuo account sul portale clienti MechMind OS in modo sicuro e veloce.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
