import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro Audit | MechMind OS',
  description: 'Consulta il registro completo di tutte le azioni effettuate nel sistema.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
