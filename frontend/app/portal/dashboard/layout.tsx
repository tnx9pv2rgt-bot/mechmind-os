import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard Clienti | MechMind OS',
  description: 'Area personale del portale clienti MechMind. Riepilogo veicoli, appuntamenti e stato delle riparazioni.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
