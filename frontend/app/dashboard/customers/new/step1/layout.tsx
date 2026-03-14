import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuovo Cliente - Dati Anagrafici | MechMind OS',
  description: 'Inserisci i dati anagrafici del nuovo cliente. Primo passo della procedura di registrazione cliente.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
