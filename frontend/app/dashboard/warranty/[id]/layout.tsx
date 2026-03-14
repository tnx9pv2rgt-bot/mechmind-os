import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dettaglio Garanzia | MechMind OS',
  description: 'Dettagli della garanzia del veicolo. Copertura, scadenza, storico reclami e informazioni del fornitore.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
