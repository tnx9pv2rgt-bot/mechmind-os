import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuova Prenotazione | MechMind OS',
  description: 'Crea una nuova prenotazione per la tua officina. Seleziona data, orario, servizio e veicolo del cliente.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
