import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dettaglio Fattura | MechMind OS',
  description: 'Visualizza i dettagli della fattura.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
