import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Benvenuto | MechMind OS',
  description: 'Inizia il percorso di onboarding su MechMind OS. Configura il tuo account in pochi minuti.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
