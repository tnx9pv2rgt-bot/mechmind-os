import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuovo Cliente - Veicoli | MechMind OS',
  description: 'Aggiungi i veicoli del nuovo cliente. Targa, marca, modello e chilometraggio con ricerca automatica.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
