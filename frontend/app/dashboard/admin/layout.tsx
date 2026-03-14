import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Amministrazione | MechMind OS',
  description: 'Pannello di amministrazione MechMind OS per la gestione avanzata della piattaforma.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
