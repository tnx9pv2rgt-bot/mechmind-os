import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nuova Fattura | MechMind OS',
  description: 'Crea una nuova fattura per i tuoi clienti.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
