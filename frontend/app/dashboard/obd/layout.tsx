import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OBD Diagnostica | MechMind OS',
  description: 'Diagnostica OBD in tempo reale per i veicoli della tua officina. Codici errore, parametri e analisi motore.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
