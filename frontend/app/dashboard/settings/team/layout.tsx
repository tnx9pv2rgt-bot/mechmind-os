import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team | MechMind OS',
  description: 'Gestisci i membri del team, invita nuovi utenti e assegna ruoli.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
