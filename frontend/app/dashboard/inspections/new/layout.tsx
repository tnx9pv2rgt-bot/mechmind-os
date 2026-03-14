import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuova Ispezione | MechMind OS',
  description: 'Crea una nuova ispezione digitale del veicolo. Seleziona il template e compila la checklist completa.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
