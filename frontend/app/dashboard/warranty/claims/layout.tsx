import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reclami Garanzia | MechMind OS',
  description: 'Gestisci i reclami delle garanzie. Revisione, approvazione e tracciamento dello stato di ogni richiesta.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
