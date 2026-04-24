'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  RefreshCcw,
  ArrowLeft,
  Clock,
  Shield,
  Lock,
  History,
  Undo2,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

// Initialize Stripe (in production, use env variable)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

// Types
export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'requires_capture'
    | 'canceled'
    | 'succeeded';
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
  createdAt: string;
  refundedAt?: string;
  refundAmount?: number;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  receiptUrl?: string;
}

export interface InvoicePayment {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentIntentId?: string;
  paidAt?: string;
  paymentHistory: PaymentHistory[];
}

// Mock payment data
const mockInvoicePayment: InvoicePayment = {
  invoiceId: 'inv-2',
  invoiceNumber: 'INV-2024-002',
  customerName: 'Laura Bianchi',
  amount: 890.5,
  currency: 'EUR',
  status: 'pending',
  paymentHistory: [],
};

// Card input styles
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

// Payment Form Component
function PaymentForm({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // In production: create payment intent on server and confirm
    // const { error: submitError } = await stripe.confirmPayment({
    //   elements,
    //   confirmParams: {
    //     return_url: `${window.location.origin}/dashboard/invoices/payment-success`,
    //   },
    // })

    // Mock success for demo
    setTimeout(() => {
      setIsLoading(false);
      onSuccess('pi_mock_' + Date.now());
    }, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)]'>
        <CardElement options={cardElementOptions} />
      </div>

      {error && (
        <div className='flex items-center gap-2 rounded-lg bg-[var(--status-error-subtle)] p-3 text-sm text-[var(--status-error)] dark:bg-[var(--status-error-subtle)] dark:text-[var(--status-error)]'>
          <AlertCircle className='h-4 w-4' />
          {error}
        </div>
      )}

      <div className='flex gap-3'>
        <Button type='button' variant='outline' onClick={onCancel} className='flex-1'>
          Annulla
        </Button>
        <Button type='submit' disabled={!stripe || isLoading} className='flex-1'>
          {isLoading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Elaborazione...
            </>
          ) : (
            <>
              <Lock className='mr-2 h-4 w-4' />
              Paga {formatCurrency(amount)}
            </>
          )}
        </Button>
      </div>

      <div className='flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]'>
        <Shield className='h-3 w-3' />
        Pagamento sicuro con Stripe
      </div>
    </form>
  );
}

// Payment Success Component
function PaymentSuccess({
  amount,
  onClose,
  onViewReceipt,
}: {
  amount: number;
  onClose: () => void;
  onViewReceipt: () => void;
}) {
  return (
    <div className='text-center py-8'>
      <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40/30'>
        <CheckCircle2 className='h-8 w-8 text-[var(--status-success)] dark:text-[var(--status-success)]' />
      </div>
      <h3 className='mt-4 text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
        Pagamento Completato!
      </h3>
      <p className='mt-2 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Hai pagato {formatCurrency(amount)}</p>
      <div className='mt-6 flex justify-center gap-3'>
        <Button variant='outline' onClick={onClose}>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Torna alle Fatture
        </Button>
        <Button onClick={onViewReceipt}>
          <Receipt className='mr-2 h-4 w-4' />
          Ricevuta
        </Button>
      </div>
    </div>
  );
}

// Payment Status Badge
function PaymentStatusBadge({ status }: { status: PaymentHistory['status'] }) {
  const config = {
    succeeded: {
      label: 'Completato',
      className: 'bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:bg-[var(--status-success)]/40/30 dark:text-[var(--status-success)]',
      icon: CheckCircle2,
    },
    failed: {
      label: 'Fallito',
      className: 'bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:bg-[var(--status-error)]/40/30 dark:text-[var(--status-error)]',
      icon: AlertCircle,
    },
    refunded: {
      label: 'Rimborsato',
      className: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] dark:bg-[var(--border-default)] dark:text-[var(--text-primary)]',
      icon: Undo2,
    },
    partially_refunded: {
      label: 'Rimborso Parziale',
      className: 'bg-[var(--status-warning-subtle)] text-[var(--status-warning)] dark:bg-[var(--status-warning)]/40/30 dark:text-[var(--status-warning)]',
      icon: Undo2,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon className='h-3.5 w-3.5' />
      {label}
    </span>
  );
}

// Refund Dialog Component
function RefundDialog({
  payment,
  onRefund,
}: {
  payment: PaymentHistory;
  onRefund: (amount: number) => void;
}) {
  const [refundAmount, setRefundAmount] = useState(payment.amount);
  const [isOpen, setIsOpen] = useState(false);

  const handleRefund = () => {
    onRefund(refundAmount);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='sm'>
          <Undo2 className='mr-2 h-4 w-4' />
          Rimborsa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Effettua Rimborso</DialogTitle>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
            Importo originale: {formatCurrency(payment.amount)}
          </p>
          <div className='space-y-2'>
            <label htmlFor='refundAmount' className='text-sm font-medium'>
              Importo da rimborsare
            </label>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]'>€</span>
              <Input
                id='refundAmount'
                type='number'
                min='0.01'
                max={payment.amount}
                step='0.01'
                value={refundAmount}
                onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                className='pl-7'
              />
            </div>
          </div>
          <div className='flex gap-3'>
            <Button variant='outline' onClick={() => setIsOpen(false)} className='flex-1'>
              Annulla
            </Button>
            <Button
              onClick={handleRefund}
              disabled={refundAmount <= 0 || refundAmount > payment.amount}
              variant='destructive'
              className='flex-1'
            >
              Conferma Rimborso
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Stripe Payment Component
export function StripePayment({
  invoicePayment = mockInvoicePayment,
}: {
  invoicePayment?: InvoicePayment;
}) {
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'processing' | 'succeeded' | 'failed'
  >('idle');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  const handleStartPayment = async () => {
    // In production: call API to create payment intent
    // const response = await fetch('/api/payments/create-intent', {
    //   method: 'POST',
    //   body: JSON.stringify({ invoiceId: invoicePayment.invoiceId }),
    // })
    // const data = await response.json()

    // Mock payment intent
    setPaymentIntent({
      id: 'pi_' + Date.now(),
      clientSecret: 'pi_' + Date.now() + '_secret_' + Math.random().toString(36).substring(7),
      amount: invoicePayment.amount,
      currency: invoicePayment.currency,
      status: 'requires_payment_method',
    });
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentStatus('succeeded');
    // In production: verify payment on server
  };

  const handleRefund = async (paymentId: string, amount: number) => {
    // Call backend Stripe refund endpoint
    const res = await fetch('/api/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, amount }),
    });
    if (!res.ok) throw new Error(`Refund failed: ${res.status}`);

    // Update local state
    setPaymentHistory(prev =>
      prev.map(p =>
        p.id === paymentId
          ? {
              ...p,
              status: amount === p.amount ? 'refunded' : 'partially_refunded',
              refundedAt: new Date().toISOString(),
              refundAmount: amount,
            }
          : p
      )
    );
  };

  const getCardIcon = (brand: string) => {
    // In production: use actual card brand icons
    return <CreditCard className='h-4 w-4' />;
  };

  // Show success state
  if (paymentStatus === 'succeeded') {
    return (
      <Elements stripe={stripePromise}>
        <PaymentSuccess
          amount={invoicePayment.amount}
          onClose={() => setPaymentStatus('idle')}
          onViewReceipt={() =>
            window.open(`/dashboard/invoices/${invoicePayment.invoiceId}`, '_blank')
          }
        />
      </Elements>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Payment Card */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <CreditCard className='h-5 w-5' />
                Pagamento Fattura
              </CardTitle>
              <CardDescription>
                {invoicePayment.invoiceNumber} - {invoicePayment.customerName}
              </CardDescription>
            </div>
            <div className='text-right'>
              <p className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {formatCurrency(invoicePayment.amount)}
              </p>
              <p className='text-xs text-[var(--text-tertiary)]'>Totale da pagare</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!showPaymentForm ? (
            <div className='space-y-4'>
              {invoicePayment.status === 'paid' ? (
                <div className='flex items-center gap-3 rounded-lg bg-[var(--status-success-subtle)] p-4 dark:bg-[var(--status-success-subtle)]'>
                  <CheckCircle2 className='h-5 w-5 text-[var(--status-success)] dark:text-[var(--status-success)]' />
                  <div>
                    <p className='font-medium text-[var(--status-success)] dark:text-[var(--status-success)]'>
                      Fattura già pagata
                    </p>
                    <p className='text-sm text-[var(--status-success)] dark:text-[var(--status-success)]'>
                      Pagata il {invoicePayment.paidAt && formatDateTime(invoicePayment.paidAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className='rounded-lg border border-[var(--border-default)] p-4 dark:border-[var(--border-default)]'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div className='rounded-full bg-[var(--brand)]/10 p-2 dark:bg-[var(--brand)]/40/30'>
                          <CreditCard className='h-5 w-5 text-[var(--brand)]' />
                        </div>
                        <div>
                          <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            Carta di credito/debito
                          </p>
                          <p className='text-sm text-[var(--text-tertiary)]'>
                            Visa, Mastercard, American Express
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleStartPayment}>Paga Ora</Button>
                    </div>
                  </div>

                  <div className='flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]'>
                    <Lock className='h-3 w-3' />
                    Pagamento sicuro con crittografia SSL
                  </div>
                </>
              )}
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: paymentIntent?.clientSecret }}
            >
              <PaymentForm
                amount={invoicePayment.amount}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowPaymentForm(false)}
              />
            </Elements>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <History className='h-5 w-5' />
            Storico Pagamenti
          </CardTitle>
          <CardDescription>Visualizza e gestisci i pagamenti precedenti</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length === 0 ? (
            <div className='py-8 text-center'>
              <Clock className='mx-auto h-10 w-10 text-[var(--text-tertiary)]' />
              <p className='mt-2 text-sm text-[var(--text-tertiary)]'>Nessun pagamento effettuato</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {paymentHistory.map(payment => (
                <div
                  key={payment.id}
                  className='flex items-center justify-between rounded-lg border border-[var(--border-default)] p-4 dark:border-[var(--border-default)]'
                >
                  <div className='flex items-center gap-3'>
                    <div className='rounded-full bg-[var(--surface-secondary)] p-2 dark:bg-[var(--surface-primary)]'>
                      {getCardIcon(payment.paymentMethod.brand)}
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium capitalize text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {payment.paymentMethod.brand}
                        </span>
                        <span className='text-sm text-[var(--text-tertiary)]'>
                          •••• {payment.paymentMethod.last4}
                        </span>
                      </div>
                      <p className='text-xs text-[var(--text-tertiary)]'>
                        Scadenza {payment.paymentMethod.expMonth}/{payment.paymentMethod.expYear}
                      </p>
                      <p className='text-xs text-[var(--text-tertiary)]'>{formatDateTime(payment.createdAt)}</p>
                    </div>
                  </div>

                  <div className='text-right'>
                    <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {formatCurrency(payment.amount)}
                    </p>
                    <div className='flex items-center gap-2'>
                      <PaymentStatusBadge status={payment.status} />
                      {payment.status === 'succeeded' && (
                        <RefundDialog
                          payment={payment}
                          onRefund={amount => handleRefund(payment.id, amount)}
                        />
                      )}
                    </div>
                    {payment.refundedAt && (
                      <p className='text-xs text-[var(--text-tertiary)]'>
                        Rimborsato il {formatDateTime(payment.refundedAt)}
                        {payment.refundAmount && payment.refundAmount < payment.amount && (
                          <span> ({formatCurrency(payment.refundAmount)})</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
