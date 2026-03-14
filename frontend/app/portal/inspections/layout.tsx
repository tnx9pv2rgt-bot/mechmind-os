import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Le Mie Ispezioni | MechMind OS',
  description: 'Visualizza i report delle ispezioni effettuate sui tuoi veicoli con foto e dettagli degli interventi.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
