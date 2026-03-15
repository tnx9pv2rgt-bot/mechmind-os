import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dettaglio Ordine di Lavoro | MechMind OS',
  description: "Visualizza e gestisci i dettagli dell'ordine di lavoro.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
