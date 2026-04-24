'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Car,
  FileText,
  Euro,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tier?: string;
}

interface EstimateData {
  id: string;
  number: string;
  date: string;
  expiresAt?: string;
  workshopName: string;
  workshopPhone?: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  customerName: string;
  items: EstimateLineItem[];
  total: number;
  notes?: string;
  status: string;
}

interface LineDecision {
  approved: boolean;
  rejectionReason: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PublicEstimateApprovalPage() {
  const params = useParams();
  const token = params.token as string;

  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, LineDecision>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});
  const [customerSignature, setCustomerSignature] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Fetch estimate data
  useEffect(() => {
    async function fetchEstimate(): Promise<void> {
      try {
        const res = await fetch(`/api/public/estimates/${token}`, { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 404) {
            setError('Preventivo non trovato o link scaduto.');
          } else {
            setError('Errore nel caricamento del preventivo.');
          }
          return;
        }
        const data = (await res.json()) as EstimateData;
        setEstimate(data);
        // Default all lines to approved
        const initial: Record<string, LineDecision> = {};
        for (const item of data.items) {
          initial[item.id] = { approved: true, rejectionReason: '' };
        }
        setDecisions(initial);
      } catch {
        setError('Impossibile connettersi al server. Riprova.');
      } finally {
        setLoading(false);
      }
    }
    fetchEstimate();
  }, [token]);

  const toggleDecision = useCallback((itemId: string) => {
    setDecisions(prev => {
      const current = prev[itemId];
      return {
        ...prev,
        [itemId]: { ...current, approved: !current.approved },
      };
    });
  }, []);

  const setRejectionReason = useCallback((itemId: string, reason: string) => {
    setDecisions(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], rejectionReason: reason },
    }));
  }, []);

  const toggleReasonExpanded = useCallback((itemId: string) => {
    setExpandedReasons(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const approveAll = useCallback(() => {
    if (!estimate) return;
    const updated: Record<string, LineDecision> = {};
    for (const item of estimate.items) {
      updated[item.id] = { approved: true, rejectionReason: '' };
    }
    setDecisions(updated);
    toast.success('Tutte le voci approvate');
  }, [estimate]);

  const approvedTotal = estimate
    ? estimate.items
        .filter(item => decisions[item.id]?.approved)
        .reduce((sum, item) => sum + item.total, 0)
    : 0;

  const handleSubmit = async (): Promise<void> => {
    if (!estimate || submitting) return;

    if (!customerSignature.trim() || customerSignature.trim().length < 2) {
      toast.error('Inserisci il tuo nome e cognome per firmare il preventivo.');
      return;
    }
    if (!termsAccepted) {
      toast.error('Devi accettare i termini e condizioni per procedere.');
      return;
    }

    setSubmitting(true);

    try {
      const allApprovedByCustomer = Object.values(decisions).every(d => d.approved);

      let res: Response;
      if (allApprovedByCustomer) {
        res = await fetch(`/api/public/estimates/${token}/approve-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerSignature: customerSignature.trim(), termsAccepted }),
        });
      } else {
        const approvals = Object.entries(decisions).map(([lineId, decision]) => ({
          lineId,
          approved: decision.approved,
          reason: decision.approved ? undefined : decision.rejectionReason || undefined,
        }));
        res = await fetch(`/api/public/estimates/${token}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvals, customerSignature: customerSignature.trim(), termsAccepted }),
        });
      }

      if (!res.ok) {
        toast.error('Errore nell\'invio della risposta. Riprova.');
        return;
      }

      setSubmitted(true);
      toast.success('Risposta inviata con successo!');
    } catch {
      toast.error('Errore di connessione. Riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Caricamento preventivo...</p>
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !estimate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-[var(--status-error)]" />
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-center text-lg font-medium">
          {error || 'Preventivo non trovato'}
        </p>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-center text-sm">
          Contatta l&apos;officina se il problema persiste.
        </p>
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------
  if (submitted) {
    const allApproved = Object.values(decisions).every(d => d.approved);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--status-success-subtle)] dark:bg-[var(--status-success)]/40/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-[var(--status-success)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Grazie!</h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] max-w-md">
          {allApproved
            ? 'Hai approvato tutti i lavori. L\'officina ti contatter\u00e0 per confermare la data di intervento.'
            : `Hai approvato lavori per ${formatCurrency(approvedTotal)}. L'officina ricever\u00e0 le tue indicazioni.`}
        </p>
        {estimate.workshopPhone && (
          <a
            href={`tel:${estimate.workshopPhone}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand)] text-[var(--text-on-brand)] font-medium
                       hover:bg-[var(--brand)]/90 transition-colors min-h-[44px]"
          >
            Chiama l&apos;officina
          </a>
        )}
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <Toaster richColors position="top-center" />

      {/* Estimate Header */}
      <div className="bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
              <FileText className="w-4 h-4" />
              Preventivo {estimate.number}
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
              {estimate.workshopName}
            </h1>
          </div>
          <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
            {new Date(estimate.date).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]">
          <Car className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {estimate.vehicleBrand} {estimate.vehicleModel}
              {estimate.vehicleYear ? ` (${estimate.vehicleYear})` : ''}
            </p>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
              Targa: {estimate.vehiclePlate}
            </p>
          </div>
        </div>

        {estimate.expiresAt && (
          <p className="text-xs text-[var(--status-warning)] dark:text-[var(--status-warning)]">
            Valido fino al{' '}
            {new Date(estimate.expiresAt).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-wider">
            Voci del preventivo
          </h2>
          <button
            type="button"
            onClick={approveAll}
            className="text-sm font-medium text-[var(--status-success)] dark:text-[var(--status-success)] hover:text-[var(--status-success)]
                       dark:hover:text-[var(--status-success)] transition-colors min-h-[44px] px-3 flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            Approva tutto
          </button>
        </div>

        {estimate.items.map(item => {
          const decision = decisions[item.id];
          const isApproved = decision?.approved ?? true;
          const isReasonExpanded = expandedReasons[item.id] ?? false;

          return (
            <div
              key={item.id}
              className={`bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-xl border transition-colors ${
                isApproved
                  ? 'border-[var(--status-success)]/30 dark:border-[var(--status-success)]/40'
                  : 'border-[var(--status-error)]/30 dark:border-[var(--status-error)]/40'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">
                        {item.description}
                      </p>
                      {item.tier && (
                        <span className="flex-shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--brand)]/10 dark:bg-[var(--brand-subtle)] text-[var(--brand)] dark:text-[var(--brand)]">
                          {item.tier}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                      <span>
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-sm">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>

                  {/* Approve/Reject Toggle */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isApproved) toggleDecision(item.id);
                      }}
                      className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                        isApproved
                          ? 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:text-[var(--status-success)] ring-2 ring-[var(--status-success)]/30'
                          : 'bg-[var(--surface-hover)] dark:bg-[var(--surface-active)] text-[var(--text-tertiary)] hover:bg-[var(--status-success-subtle)] dark:hover:bg-[var(--status-success-subtle)]'
                      }`}
                      aria-label="Approva"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isApproved) {
                          toggleDecision(item.id);
                          setExpandedReasons(prev => ({ ...prev, [item.id]: true }));
                        }
                      }}
                      className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                        !isApproved
                          ? 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:text-[var(--status-error)] ring-2 ring-[var(--status-error)]/30'
                          : 'bg-[var(--surface-hover)] dark:bg-[var(--surface-active)] text-[var(--text-tertiary)] hover:bg-[var(--status-error-subtle)] dark:hover:bg-[var(--status-error-subtle)]'
                      }`}
                      aria-label="Rifiuta"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Rejection reason */}
                {!isApproved && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => toggleReasonExpanded(item.id)}
                      className="flex items-center gap-1 text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]
                                 hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-tertiary)] min-h-[44px] transition-colors"
                    >
                      {isReasonExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      Motivo del rifiuto (opzionale)
                    </button>
                    {isReasonExpanded && (
                      <textarea
                        value={decision?.rejectionReason || ''}
                        onChange={e => setRejectionReason(item.id, e.target.value)}
                        placeholder="Descrivi il motivo..."
                        rows={2}
                        className="mt-2 w-full rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]
                                   bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]
                                   placeholder:text-[var(--text-tertiary)] dark:placeholder:text-[var(--text-secondary)]
                                   focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 resize-none"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {estimate.notes && (
        <div className="bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/10 rounded-xl border border-[var(--status-warning)]/30 dark:border-[var(--status-warning)]/30 p-4">
          <p className="text-xs font-medium text-[var(--status-warning)] dark:text-[var(--status-warning)] uppercase mb-1">
            Note dell&apos;officina
          </p>
          <p className="text-sm text-[var(--status-warning)] dark:text-[var(--status-warning)]">{estimate.notes}</p>
        </div>
      )}

      {/* Total Summary */}
      <div className="bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">Totale preventivo</span>
          <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] line-through">
            {formatCurrency(estimate.total)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Totale approvato</span>
          <span className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-1">
            <Euro className="w-5 h-5" />
            {formatCurrency(approvedTotal)}
          </span>
        </div>
      </div>

      {/* Firma digitale + Termini (D.Lgs. 206/2005) */}
      <div className="bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-wider">
          Firma e Consenso
        </h2>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1.5">
            Nome e Cognome (firma digitale) *
          </label>
          <input
            type="text"
            value={customerSignature}
            onChange={e => setCustomerSignature(e.target.value)}
            placeholder="es. Mario Rossi"
            className="w-full h-12 px-4 rounded-xl border border-[var(--border-default)] dark:border-[var(--border-strong)]
                       bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-base text-[var(--text-primary)] dark:text-[var(--text-primary)]
                       placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
          />
          <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mt-1">
            Inserendo il tuo nome accetti il preventivo con valore di firma ai sensi del D.Lgs. 206/2005.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-[var(--border-default)] text-[var(--brand)] focus:ring-[var(--brand)]/30 flex-shrink-0"
          />
          <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
            Autorizzo l&apos;officina ad eseguire i lavori approvati. Sono consapevole che lavori aggiuntivi oltre il
            10% del presente preventivo richiedono mia esplicita autorizzazione (D.Lgs. 206/2005 art. 67).
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !customerSignature.trim() || !termsAccepted}
        className="w-full py-4 rounded-xl bg-[var(--brand)] text-[var(--text-on-brand)] font-semibold text-base
                   hover:bg-[var(--brand)]/90 active:bg-[var(--status-info)] disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors min-h-[52px] flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Invio in corso...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Firma e Conferma
          </>
        )}
      </button>
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
