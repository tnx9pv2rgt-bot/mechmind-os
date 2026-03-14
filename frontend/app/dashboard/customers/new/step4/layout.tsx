import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuovo Cliente - Conferma | MechMind OS',
  description: "Verifica e conferma i dati del nuovo cliente prima del salvataggio definitivo nell'anagrafica.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
