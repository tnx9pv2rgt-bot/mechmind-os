import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dettaglio Ispezione | MechMind OS',
  description: "Visualizza il report completo dell'ispezione del veicolo con checklist, foto e valutazioni dettagliate.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
