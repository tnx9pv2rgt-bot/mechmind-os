import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manutenzione | MechMind OS',
  description: 'Consulta il piano di manutenzione dei tuoi veicoli. Scadenze, interventi consigliati e storico completo.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
