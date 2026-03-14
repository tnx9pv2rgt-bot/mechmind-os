import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Garanzie | MechMind OS',
  description: 'Gestisci le garanzie dei veicoli della tua officina. Monitoraggio scadenze, reclami e coperture attive.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
