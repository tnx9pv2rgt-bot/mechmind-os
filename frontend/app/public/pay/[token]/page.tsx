'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CreditCard,
  Loader2,
  AlertCircle,
  Shield,
  Lock,
  FileText,
  Euro,
  Calendar,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PaymentData {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  workshopName: string;
  customerName: string;
  items: InvoiceLineItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  stripeCheckoutUrl?: string;
  stripeBnplUrl?: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PublicPaymentPage() {
  const params = useParams();
  const token = params.token as string;

  const [invoice, setInvoice] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState<'full' | 'bnpl' | null>(null);

  useEffect(() => {
    async function fetchInvoice(): Promise<void> {
      try {
        const res = await fetch(`/api/public/pay/${token}`, { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 404) {
            setError('Fattura non trovata o link scaduto.');
          } else {
            setError('Errore nel caricamento della fattura.');
          }
          return;
        }
        const data = (await res.json()) as PaymentData;
        setInvoice(data);
      } catch {
        setError('Impossibile connettersi al server. Riprova.');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [token]);

  const handlePay = async (type: 'full' | 'bnpl'): Promise<void> => {
    if (!invoice || redirecting) return;
    setRedirecting(type);

    try {
      const res = await fetch(`/api/public/pay/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        toast.error('Errore nell\'avvio del pagamento. Riprova.');
        setRedirecting(null);
        return;
      }

      const data = (await res.json()) as { checkoutUrl: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('URL di pagamento non disponibile.');
        setRedirecting(null);
      }
    } catch {
      toast.error('Errore di connessione. Riprova.');
      setRedirecting(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Caricamento fattura...</p>
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-center text-lg font-medium">
          {error || 'Fattura non trovata'}
        </p>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-center text-sm">
          Contatta l&apos;officina se il problema persiste.
        </p>
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Already paid
  // ---------------------------------------------------------------------------
  if (invoice.status === 'PAID') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Pagamento completato</h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
          La fattura {invoice.invoiceNumber} risulta gi\u00e0 saldata. Grazie!
        </p>
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <Toaster richColors position="top-center" />

      {/* Invoice Header */}
      <div className="bg-white dark:bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
              <FileText className="w-4 h-4" />
              Fattura {invoice.invoiceNumber}
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
              {invoice.workshopName}
            </h1>
          </div>
          <div className="text-right text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
            <div className="flex items-center gap-1 justify-end">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(invoice.date).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            {invoice.dueDate && (
              <p className="text-xs mt-0.5">
                Scadenza:{' '}
                {new Date(invoice.dueDate).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white dark:bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-default)] dark:border-[var(--border-strong)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] uppercase tracking-wider">
            Dettaglio voci
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-[var(--border-strong)]">
          {invoice.items.map((item, index) => (
            <div key={index} className="px-5 py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">
                  {item.description}
                </p>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex-shrink-0">
                {formatCurrency(item.total)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-5 py-4 bg-white dark:bg-[var(--surface-primary)] space-y-2">
          <div className="flex justify-between text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
            <span>Imponibile</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
            <span>IVA</span>
            <span>{formatCurrency(invoice.vatAmount)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
            <span className="text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Totale</span>
            <span className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-1">
              <Euro className="w-5 h-5" />
              {formatCurrency(invoice.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handlePay('full')}
          disabled={redirecting !== null}
          className="w-full py-4 rounded-xl bg-[var(--brand)] text-white font-semibold text-base
                     hover:bg-[var(--brand)]/90 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors min-h-[52px] flex items-center justify-center gap-2"
        >
          {redirecting === 'full' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Reindirizzamento...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Paga ora {formatCurrency(invoice.total)}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => handlePay('bnpl')}
          disabled={redirecting !== null}
          className="w-full py-4 rounded-xl bg-white dark:bg-[var(--surface-elevated)] border-2 border-[var(--border-default)]
                     dark:border-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)] font-semibold text-base
                     hover:bg-white dark:hover:bg-[var(--surface-active)] active:bg-[var(--surface-hover)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors min-h-[52px] flex items-center justify-center gap-2"
        >
          {redirecting === 'bnpl' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Reindirizzamento...
            </>
          ) : (
            <>
              <Layers className="w-5 h-5" />
              Paga in 3 rate da {formatCurrency(invoice.total / 3)}
            </>
          )}
        </button>
      </div>

      {/* Security Badges */}
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light">
          <Shield className="w-4 h-4" />
          <span>Stripe</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light">
          <Lock className="w-4 h-4" />
          <span>SSL Sicuro</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]-light">
          <CreditCard className="w-4 h-4" />
          <span>PCI DSS</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
