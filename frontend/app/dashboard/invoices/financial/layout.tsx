import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documenti Fiscali | MechMind OS',
  description: 'Gestione completa dei documenti fiscali e contabili della tua officina automotive con MechMind OS.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
