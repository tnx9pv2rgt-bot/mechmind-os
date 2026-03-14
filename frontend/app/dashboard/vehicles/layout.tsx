import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Veicoli | MechMind OS',
  description: "Gestisci l'archivio veicoli della tua officina. Anagrafica, storico interventi e scadenze per ogni veicolo.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
