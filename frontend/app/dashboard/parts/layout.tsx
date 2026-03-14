import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ricambi | MechMind OS',
  description: 'Gestisci il magazzino ricambi della tua officina. Inventario, ordini e ricerca pezzi con prezzi aggiornati.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
