import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuovo Veicolo | MechMind OS',
  description: "Registra un nuovo veicolo nell'archivio della tua officina. Dati tecnici, targa e associazione al cliente.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
