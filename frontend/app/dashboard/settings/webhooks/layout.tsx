import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Webhook | MechMind OS',
  description: 'Configura i webhook per ricevere notifiche in tempo reale sugli eventi del sistema.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
