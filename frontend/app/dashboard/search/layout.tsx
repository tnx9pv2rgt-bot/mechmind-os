import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ricerca | MechMind OS',
  description: 'Cerca clienti, veicoli, ordini di lavoro, fatture e prenotazioni.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
