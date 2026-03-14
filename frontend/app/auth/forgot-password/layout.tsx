import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recupera Password | MechMind OS',
  description: 'Recupera la password del tuo account MechMind OS. Inserisci la tua email per ricevere il link di ripristino.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
