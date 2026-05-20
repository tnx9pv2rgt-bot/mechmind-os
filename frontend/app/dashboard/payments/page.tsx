'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { CreditCard, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMethodData {
  hasPaymentMethod: boolean;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  plan: string | null;
  currentPeriodEnd: string | null;
}

interface PaymentMethodResponse {
  success: boolean;
  data: PaymentMethodData;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Attivo',
  TRIAL: 'Prova gratuita',
  PAST_DUE: 'Pagamento scaduto',
  CANCELLED: 'Cancellato',
  SUSPENDED: 'Sospeso',
};

export default function PaymentsPage() {
  const { data, isLoading, mutate } = useSWR<PaymentMethodResponse>(
    '/api/dashboard/billing/payment-method',
    fetcher,
  );

  const payment = data?.data;

  async function handleUpdate() {
    try {
      const res = await fetch('/api/dashboard/billing/payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Metodo di pagamento aggiornato');
        void mutate();
      } else {
        toast.error(json.error?.message ?? 'Errore aggiornamento');
      }
    } catch {
      toast.error('Errore di rete');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-blue-500" />
        <h1 className="text-2xl font-semibold">Pagamenti</h1>
      </div>

      <AppleCard>
        <AppleCardHeader title="Metodo di pagamento" />
        <AppleCardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Caricamento...</span>
            </div>
          ) : !payment ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>Impossibile caricare i dati</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                {payment.hasPaymentMethod ? (
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {payment.hasPaymentMethod ? 'Metodo di pagamento configurato' : 'Nessun metodo di pagamento'}
                  </p>
                  {payment.stripeCustomerId && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cliente Stripe: {payment.stripeCustomerId}
                    </p>
                  )}
                </div>
              </div>

              {payment.subscriptionStatus && (
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Abbonamento</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {STATUS_LABELS[payment.subscriptionStatus] ?? payment.subscriptionStatus}
                    </p>
                    {payment.plan && (
                      <p className="text-xs text-muted-foreground">Piano: {payment.plan}</p>
                    )}
                    {payment.currentPeriodEnd && (
                      <p className="text-xs text-muted-foreground">
                        Scade: {new Date(payment.currentPeriodEnd).toLocaleDateString('it-IT')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <AppleButton variant="primary" onClick={handleUpdate} className="w-full">
                {payment.hasPaymentMethod ? 'Aggiorna metodo di pagamento' : 'Aggiungi metodo di pagamento'}
              </AppleButton>
            </div>
          )}
        </AppleCardContent>
      </AppleCard>
    </div>
  );
}
