import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accetta Invito | MechMind OS',
  description: 'Sei stato invitato a unirti a un team su MechMind OS. Accetta l\'invito per iniziare.',
};

export default function Layout({ children }: { children: React.ReactNode }): React.ReactElement {
  return <>{children}</>;
}
