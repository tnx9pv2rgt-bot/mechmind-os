import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuova Prenotazione | Portale Clienti MechMind',
  description: 'Prenota un appuntamento presso la tua officina di fiducia. Scegli data, orario e tipo di intervento.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
