import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Garanzie | MechMind OS',
  description: 'Consulta le garanzie attive sui tuoi veicoli. Verifica coperture, scadenze e stato dei reclami.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
