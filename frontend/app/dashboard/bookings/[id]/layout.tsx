import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dettaglio Prenotazione | MechMind OS',
  description: 'Visualizza e gestisci i dettagli della prenotazione. Stato, servizi richiesti e informazioni del cliente.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
