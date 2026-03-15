import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nuovo Ordine di Lavoro | MechMind OS',
  description: 'Crea un nuovo ordine di lavoro.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
