import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ordini di Lavoro | MechMind OS',
  description: 'Gestisci gli ordini di lavoro della tua officina.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
