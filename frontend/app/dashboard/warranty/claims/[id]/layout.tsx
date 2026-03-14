import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dettaglio Reclamo | MechMind OS',
  description: 'Dettagli del reclamo di garanzia. Stato, importi, documentazione e cronologia della revisione.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
