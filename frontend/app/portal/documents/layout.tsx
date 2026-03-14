import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documenti | MechMind OS',
  description: 'Consulta i tuoi documenti: fatture, preventivi e report delle ispezioni dei tuoi veicoli.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
