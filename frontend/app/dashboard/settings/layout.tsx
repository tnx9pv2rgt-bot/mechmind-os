import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impostazioni | MechMind OS',
  description: 'Configura le impostazioni della tua officina. Profilo, notifiche, integrazioni e personalizzazioni avanzate.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
