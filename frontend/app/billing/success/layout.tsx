import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pagamento Completato | MechMind OS',
  description: 'Il pagamento per il tuo abbonamento MechMind OS è stato completato con successo.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
