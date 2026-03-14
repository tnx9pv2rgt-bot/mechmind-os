import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuovo Cliente | MechMind OS',
  description: 'Aggiungi un nuovo cliente alla tua officina. Procedura guidata con validazione dati e verifica P.IVA automatica.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
