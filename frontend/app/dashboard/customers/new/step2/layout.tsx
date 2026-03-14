import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuovo Cliente - Contatti | MechMind OS',
  description: 'Inserisci i dati di contatto del nuovo cliente. Email, telefono e indirizzo con validazione automatica.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
