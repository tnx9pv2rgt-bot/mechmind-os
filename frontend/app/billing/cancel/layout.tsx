import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pagamento Annullato | MechMind OS',
  description: 'Il pagamento per il tuo abbonamento MechMind OS è stato annullato. Puoi riprovare in qualsiasi momento.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
