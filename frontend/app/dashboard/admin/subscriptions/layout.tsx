import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestione Abbonamenti | MechMind OS',
  description: 'Amministrazione e monitoraggio di tutti gli abbonamenti dei tenant nella piattaforma MechMind OS.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
