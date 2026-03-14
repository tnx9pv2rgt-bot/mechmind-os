import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impostazioni | MechMind OS',
  description: 'Gestisci le impostazioni del tuo profilo sul portale clienti. Modifica dati personali e preferenze.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
