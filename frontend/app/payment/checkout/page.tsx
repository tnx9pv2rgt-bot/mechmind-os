'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError('Sessione di pagamento non valida');
      return;
    }

    // Redirect to Stripe checkout
    const checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}`;
    window.location.href = checkoutUrl;
  }, [sessionId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] p-8">
        <AlertCircle className="h-16 w-16 text-[var(--status-error)] mb-6" />
        <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
          Errore Pagamento
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-6">{error}</p>
        <AppleButton onClick={() => router.push('/dashboard/invoices')}>
          Torna alle Fatture
        </AppleButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] p-8">
      <Loader2 className="h-12 w-12 animate-spin text-[var(--brand)] mb-6" />
      <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
        Reindirizzamento al pagamento...
      </h1>
      <p className="text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
        Attendi, stai per essere reindirizzato alla pagina di pagamento sicuro.
      </p>
    </div>
  );
}

export default function PaymentCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] p-8">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--brand)] mb-6" />
          <p className="text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Caricamento...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
