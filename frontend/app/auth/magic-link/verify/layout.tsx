import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verifica Magic Link | MechMind OS',
  description: 'Verifica del link di accesso MechMind OS. Autenticazione in corso tramite magic link sicuro.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
