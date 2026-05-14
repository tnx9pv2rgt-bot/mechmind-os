import type { Metadata } from 'next';
import { Pricing } from '@/components/marketing/pricing';

export const metadata: Metadata = {
  title: 'Prezzi | MechMind OS',
  description:
    'Piani e prezzi trasparenti per la gestione della tua officina. Prova gratuita 14 giorni, senza carta di credito. Tutti i piani includono supporto.',
};

export default function PricingPage() {
  return (
    <main className='min-h-screen'>
      <Pricing />
    </main>
  );
}
