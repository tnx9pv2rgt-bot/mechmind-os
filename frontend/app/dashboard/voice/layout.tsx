import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assistente Vocale AI | MechMind OS',
  description: 'Gestisci l\'assistente vocale AI per le chiamate automatiche della tua officina.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
