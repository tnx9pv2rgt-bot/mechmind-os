import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accesso con Magic Link | MechMind OS',
  description: 'Accedi al tuo account MechMind OS tramite link magico. Autenticazione sicura senza password.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
