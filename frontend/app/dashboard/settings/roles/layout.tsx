import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ruoli e Permessi | MechMind OS',
  description: 'Configura i ruoli e i permessi di accesso per il tuo team.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
