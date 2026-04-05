'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, AlertCircle, Car, FileText } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';

interface EstimateLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface PortalEstimate {
  id: string;
  number: string;
  status: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  shopName: string;
  shopLogo: string | null;
  validUntil: string | null;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  lines: EstimateLine[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function PortalEstimatePage() {
  const params = useParams();
  const id = params.id as string;

  const [estimate, setEstimate] = useState<PortalEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const fetchEstimate = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/portal/estimates/${id}`);
      if (!res.ok) throw new Error('Preventivo non trovato');
      const json = await res.json();
      setEstimate(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEstimate();
  }, [fetchEstimate]);

  const handleAction = async (action: 'accept' | 'reject') => {
    setActionLoading(true);
    try {
      const body = action === 'reject' && rejectReason ? { reason: rejectReason } : undefined;
      const res = await fetch(`/api/portal/estimates/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error('Errore');
      setActionDone(action === 'accept' ? 'ACCEPTED' : 'REJECTED');
    } catch {
      toast.error('Errore durante l\'operazione. Riprova.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[var(--surface-tertiary)]'>
        <Loader2 className='h-8 w-8 animate-spin text-blue-500' />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[var(--surface-tertiary)] p-8 text-center'>
        <AlertCircle className='h-12 w-12 text-gray-400 dark:text-[var(--text-secondary)] mb-4' />
        <p className='text-gray-600 dark:text-[var(--text-tertiary)]'>{error || 'Preventivo non trovato'}</p>
      </div>
    );
  }

  // Already responded
  if (actionDone === 'ACCEPTED') {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[var(--surface-tertiary)] p-8 text-center'>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='bg-white dark:bg-[var(--surface-elevated)] rounded-3xl p-8 max-w-md shadow-xl'
        >
          <CheckCircle className='h-16 w-16 text-green-500 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 dark:text-[var(--text-primary)] mb-2'>Grazie!</h2>
          <p className='text-gray-600 dark:text-[var(--text-tertiary)]'>
            L&apos;officina è stata avvisata e ti contatterà per fissare l&apos;appuntamento.
          </p>
        </motion.div>
      </div>
    );
  }

  if (actionDone === 'REJECTED') {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[var(--surface-tertiary)] p-8 text-center'>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='bg-white dark:bg-[var(--surface-elevated)] rounded-3xl p-8 max-w-md shadow-xl'
        >
          <XCircle className='h-16 w-16 text-gray-400 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 dark:text-[var(--text-primary)] mb-2'>
            Preventivo rifiutato
          </h2>
          <p className='text-gray-600 dark:text-[var(--text-tertiary)]'>
            Abbiamo registrato la tua scelta. L&apos;officina potrebbe contattarti per discutere
            alternative.
          </p>
        </motion.div>
      </div>
    );
  }

  const isExpired = estimate.validUntil && new Date(estimate.validUntil) < new Date();
  const isAlreadyHandled = estimate.status !== 'SENT';

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-[var(--surface-tertiary)]'>
      {/* Header */}
      <header className='bg-white dark:bg-[var(--surface-secondary)] border-b border-gray-200 dark:border-[var(--border-default)]'>
        <div className='max-w-3xl mx-auto px-6 py-6'>
          <div className='flex items-center gap-4'>
            {estimate.shopLogo && (
              <img
                src={estimate.shopLogo}
                alt='Logo'
                className='h-12 w-12 rounded-xl object-cover'
              />
            )}
            <div>
              <h1 className='text-lg font-bold text-gray-900 dark:text-[var(--text-primary)]'>
                {estimate.shopName || 'Officina'}
              </h1>
              <p className='text-sm text-gray-500 dark:text-[var(--text-secondary)]'>
                Preventivo {estimate.number}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-3xl mx-auto px-6 py-8 space-y-6'>
        <Breadcrumb
          items={[
            { label: 'Preventivi', href: '/portal/estimates' },
            { label: estimate.number ? `Preventivo ${estimate.number}` : 'Dettaglio Preventivo' },
          ]}
        />

        {/* Vehicle Info */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm'>
          <div className='flex items-center gap-3 mb-2'>
            <Car className='h-5 w-5 text-blue-500' />
            <h2 className='text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)]'>
              Preventivo per il tuo veicolo
            </h2>
          </div>
          <p className='text-gray-600 dark:text-[var(--text-tertiary)]'>
            {estimate.vehiclePlate} — {estimate.vehicleMake} {estimate.vehicleModel}
          </p>
        </div>

        {/* Lines */}
        <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm'>
          <h3 className='font-semibold text-gray-900 dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
            <FileText className='h-4 w-4 text-gray-400 dark:text-[var(--text-secondary)]' />
            Dettaglio lavori
          </h3>
          <div className='space-y-3'>
            {(estimate.lines || []).map(line => (
              <div
                key={line.id}
                className='flex justify-between items-start py-2 border-b border-gray-100 dark:border-[var(--border-default)] last:border-0'
              >
                <div className='flex-1'>
                  <p className='text-sm font-medium text-gray-900 dark:text-[var(--text-primary)]'>
                    {line.description}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-[var(--text-secondary)]'>
                    {line.quantity} x {formatCurrency(line.unitPrice)} (IVA {line.taxRate}%)
                  </p>
                </div>
                <p className='text-sm font-semibold text-gray-900 dark:text-[var(--text-primary)] ml-4'>
                  {formatCurrency(line.total || line.quantity * line.unitPrice)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className='mt-6 pt-4 border-t border-gray-200 dark:border-[var(--border-default)] space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-[var(--text-secondary)]'>Subtotale</span>
              <span className='font-medium dark:text-[var(--text-primary)]'>{formatCurrency(estimate.subtotal)}</span>
            </div>
            {estimate.discount > 0 && (
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500 dark:text-[var(--text-secondary)]'>Sconto</span>
                <span className='font-medium text-red-500'>
                  -{formatCurrency(estimate.discount)}
                </span>
              </div>
            )}
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-[var(--text-secondary)]'>IVA</span>
              <span className='font-medium dark:text-[var(--text-primary)]'>{formatCurrency(estimate.taxAmount)}</span>
            </div>
            <div className='flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-[var(--border-default)]'>
              <span className='text-gray-900 dark:text-[var(--text-primary)]'>Totale</span>
              <span className='text-gray-900 dark:text-[var(--text-primary)]'>
                {formatCurrency(estimate.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm'>
            <h3 className='font-semibold text-gray-900 dark:text-[var(--text-primary)] mb-2'>
              Note dell&apos;officina
            </h3>
            <p className='text-sm text-gray-600 dark:text-[var(--text-tertiary)] whitespace-pre-wrap'>
              {estimate.notes}
            </p>
          </div>
        )}

        {/* Validity */}
        {estimate.validUntil && (
          <div
            className={`rounded-2xl p-4 text-center text-sm ${
              isExpired
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            }`}
          >
            {isExpired
              ? 'Questo preventivo è scaduto.'
              : `Questo preventivo è valido fino al ${new Date(estimate.validUntil).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </div>
        )}

        {/* Actions */}
        {!isAlreadyHandled && !isExpired && (
          <div className='space-y-4'>
            {!showRejectForm ? (
              <div className='flex flex-col sm:flex-row gap-3'>
                <button
                  onClick={() => handleAction('accept')}
                  disabled={actionLoading}
                  className='flex-1 bg-green-500 hover:bg-green-600 text-white text-lg font-semibold py-4 px-6 rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
                >
                  {actionLoading ? (
                    <Loader2 className='h-5 w-5 animate-spin' />
                  ) : (
                    <CheckCircle className='h-5 w-5' />
                  )}
                  Approva preventivo
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={actionLoading}
                  className='flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-[var(--border-default)] dark:hover:bg-[var(--surface-active)] text-gray-700 dark:text-[var(--text-secondary)] text-lg font-semibold py-4 px-6 rounded-2xl transition-colors disabled:opacity-50'
                >
                  Rifiuta
                </button>
              </div>
            ) : (
              <div className='bg-white dark:bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm space-y-4'>
                <h3 className='font-semibold text-gray-900 dark:text-[var(--text-primary)]'>
                  Motivo del rifiuto (opzionale)
                </h3>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder='Scrivi qui il motivo...'
                  className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[var(--border-default)] bg-gray-50 dark:bg-[var(--surface-elevated)] text-sm dark:text-[var(--text-primary)] resize-none'
                />
                <div className='flex gap-3'>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading}
                    className='flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
                  >
                    {actionLoading ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <XCircle className='h-4 w-4' />
                    )}
                    Conferma rifiuto
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className='px-6 py-3 rounded-xl border border-gray-200 dark:border-[var(--border-default)] text-gray-600 dark:text-[var(--text-tertiary)] font-medium'
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isAlreadyHandled && (
          <div className='bg-gray-100 dark:bg-[var(--surface-elevated)] rounded-2xl p-6 text-center'>
            <p className='text-gray-600 dark:text-[var(--text-tertiary)]'>
              Questo preventivo è già stato{' '}
              {estimate.status === 'ACCEPTED'
                ? 'approvato'
                : estimate.status === 'REJECTED'
                  ? 'rifiutato'
                  : 'gestito'}
              .
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
