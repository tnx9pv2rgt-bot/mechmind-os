'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AppleCard,
  AppleCardContent,
  AppleCardHeader,
  AppleCardFooter,
} from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Printer,
  Download,
  Wrench,
  User,
  Car,
  Calendar,
  Euro,
} from 'lucide-react';
import Link from 'next/link';
import { PrintableDocument, TenantPrintInfo } from '@/components/print/printable-document';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

interface EstimateLine {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface EstimateDetail {
  id: string;
  number: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  vehicleId: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  validUntil: string | null;
  discount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  lines: EstimateLine[];
  workOrderId: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: {
    color: 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]',
    bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)]',
    label: 'Bozza',
  },
  SENT: {
    color: 'text-[var(--brand)]',
    bg: 'bg-[var(--brand)]/10',
    label: 'Inviato',
  },
  ACCEPTED: {
    color: 'text-[var(--status-success)]',
    bg: 'bg-[var(--status-success)]/10',
    label: 'Accettato',
  },
  REJECTED: {
    color: 'text-[var(--status-error)]',
    bg: 'bg-[var(--status-error)]/10',
    label: 'Rifiutato',
  },
  EXPIRED: {
    color: 'text-[var(--status-warning)]',
    bg: 'bg-[var(--status-warning)]/10',
    label: 'Scaduto',
  },
  CONVERTED: {
    color: 'text-[var(--brand)]',
    bg: 'bg-[var(--brand)]/10',
    label: 'Convertito',
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [estimate, setEstimate] = useState<EstimateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchEstimate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/estimates/${id}`);
      if (!res.ok) throw new Error('Preventivo non trovato');
      const json = await res.json();
      setEstimate(json.data ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEstimate();
  }, [fetchEstimate]);

  const performAction = async (action: string, body?: Record<string, unknown>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/estimates/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Errore operazione');
      }
      await fetchEstimate();
      const labels: Record<string, string> = {
        send: 'Preventivo inviato al cliente',
        accept: 'Preventivo segnato come accettato',
        reject: 'Preventivo segnato come rifiutato',
        'convert-to-work-order': 'Preventivo convertito in ordine di lavoro',
      };
      toast.success(labels[action] || 'Operazione completata');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/estimates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      toast.success('Preventivo eliminato');
      router.push('/dashboard/estimates');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore eliminazione preventivo');
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
        <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-4'>
          {error || 'Preventivo non trovato'}
        </p>
        <AppleButton
          variant='ghost'
          icon={<ArrowLeft className='h-4 w-4' />}
          onClick={() => router.push('/dashboard/estimates')}
        >
          Torna ai Preventivi
        </AppleButton>
      </div>
    );
  }

  const status = statusConfig[estimate.status] || statusConfig.DRAFT;

  return (
    <div>
      {/* Header */}
      <header className='no-print'>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Preventivi', href: '/dashboard/estimates' },
              { label: estimate.number || `#${id.slice(0, 8)}` },
            ]}
          />
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {estimate.number || `Preventivo #${id.slice(0, 8)}`}
              </h1>
              <span
                className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
              >
                {status.label}
              </span>
            </div>
            <div className='flex gap-2'>
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<Printer className='h-4 w-4' />}
                onClick={() => window.print()}
              >
                Stampa
              </AppleButton>
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<Download className='h-4 w-4' />}
                onClick={() => window.open(`/api/estimates/${id}/pdf`, '_blank')}
              >
                PDF
              </AppleButton>
              {estimate.status === 'DRAFT' && (
                <>
                  <AppleButton
                    icon={<Send className='h-4 w-4' />}
                    loading={actionLoading}
                    onClick={() => performAction('send')}
                  >
                    Invia al cliente
                  </AppleButton>
                  <AppleButton
                    variant='ghost'
                    className='text-[var(--status-error)] hover:opacity-80'
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    Elimina
                  </AppleButton>
                </>
              )}
              {estimate.status === 'SENT' && (
                <>
                  <AppleButton
                    icon={<CheckCircle className='h-4 w-4' />}
                    loading={actionLoading}
                    onClick={() => performAction('accept')}
                  >
                    Segna accettato
                  </AppleButton>
                  <AppleButton
                    variant='secondary'
                    icon={<XCircle className='h-4 w-4' />}
                    loading={actionLoading}
                    onClick={() => performAction('reject')}
                  >
                    Segna rifiutato
                  </AppleButton>
                </>
              )}
              {estimate.status === 'ACCEPTED' && (
                <AppleButton
                  icon={<Wrench className='h-4 w-4' />}
                  loading={actionLoading}
                  onClick={() => performAction('convert-to-work-order')}
                >
                  Converti in Ordine di Lavoro
                </AppleButton>
              )}
              {estimate.status === 'CONVERTED' && estimate.workOrderId && (
                <Link href={`/dashboard/work-orders/${estimate.workOrderId}`}>
                  <AppleButton variant='secondary' icon={<Wrench className='h-4 w-4' />}>
                    Vai all&apos;Ordine di Lavoro
                  </AppleButton>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {actionError && (
        <div className='mx-8 mt-4 flex items-center gap-2 p-3 rounded-xl bg-[var(--status-error)]/5 dark:bg-[var(--status-error)]/10 border border-[var(--status-error)]/20 no-print'>
          <AlertCircle className='h-4 w-4 text-[var(--status-error)] flex-shrink-0' />
          <p className='text-footnote text-[var(--status-error)]'>{actionError}</p>
        </div>
      )}

      <motion.div
        className='p-8 max-w-4xl mx-auto space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Info Cards */}
        <motion.div className='grid grid-cols-1 md:grid-cols-3 gap-6' variants={containerVariants}>
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center gap-2'>
                  <User className='h-4 w-4 text-[var(--text-tertiary)]' />
                  <h2 className='text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Cliente
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  {estimate.customerName}
                </p>
                {estimate.customerEmail && (
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    {estimate.customerEmail}
                  </p>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center gap-2'>
                  <Car className='h-4 w-4 text-[var(--text-tertiary)]' />
                  <h2 className='text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Veicolo
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  {estimate.vehicleMake} {estimate.vehicleModel}
                </p>
                <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  {estimate.vehiclePlate}
                </p>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center gap-2'>
                  <Calendar className='h-4 w-4 text-[var(--text-tertiary)]' />
                  <h2 className='text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Date
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Creato</span>
                  <span className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {new Date(estimate.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
                {estimate.validUntil && (
                  <div className='flex justify-between'>
                    <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Valido fino al</span>
                    <span className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {new Date(estimate.validUntil).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </motion.div>

        {/* Lines Table */}
        <motion.div variants={cardVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <div className='flex items-center gap-2'>
                <FileText className='h-4 w-4 text-[var(--text-tertiary)]' />
                <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Dettaglio Righe
                </h2>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {/* Header */}
              <div className='grid grid-cols-12 gap-3 pb-3 border-b border-[var(--border-default)]/30 dark:border-[var(--border-default)] mb-3'>
                <div className='col-span-1 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Tipo</div>
                <div className='col-span-5 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Descrizione
                </div>
                <div className='col-span-1 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>
                  Qta
                </div>
                <div className='col-span-2 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>
                  Prezzo
                </div>
                <div className='col-span-1 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>
                  IVA
                </div>
                <div className='col-span-2 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>
                  Totale
                </div>
              </div>

              <div className='space-y-1'>
                {(estimate.lines || []).map(line => (
                  <div
                    key={line.id}
                    className='grid grid-cols-12 gap-3 py-2 px-2 rounded-xl hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)] transition-colors'
                  >
                    <div className='col-span-1'>
                      <span
                        className={`text-footnote font-semibold px-1.5 py-0.5 rounded ${
                          line.type === 'LABOR'
                            ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                            : 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]'
                        }`}
                      >
                        {line.type === 'LABOR' ? 'LAV' : 'RIC'}
                      </span>
                    </div>
                    <div className='col-span-5 text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {line.description}
                    </div>
                    <div className='col-span-1 text-body text-right text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {line.quantity}
                    </div>
                    <div className='col-span-2 text-body text-right text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {formatCurrency(line.unitPrice)}
                    </div>
                    <div className='col-span-1 text-body text-right text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      {line.taxRate}%
                    </div>
                    <div className='col-span-2 text-body text-right font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {formatCurrency(line.total || line.quantity * line.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </AppleCardContent>

            <AppleCardFooter>
              <div className='flex justify-end'>
                <div className='w-full max-w-xs space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Subtotale</span>
                    <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {formatCurrency(estimate.subtotal)}
                    </span>
                  </div>
                  {estimate.discount > 0 && (
                    <div className='flex justify-between'>
                      <span className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Sconto</span>
                      <span className='text-body font-medium text-[var(--status-error)]'>
                        -{formatCurrency(estimate.discount)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <span className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>IVA</span>
                    <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {formatCurrency(estimate.taxAmount)}
                    </span>
                  </div>
                  <div className='border-t border-[var(--border-default)]/30 dark:border-[var(--border-default)] pt-2'>
                    <div className='flex justify-between'>
                      <span className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        Totale
                      </span>
                      <span className='text-body font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {formatCurrency(estimate.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AppleCardFooter>
          </AppleCard>
        </motion.div>

        {/* Notes */}
        {estimate.notes && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Note
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] whitespace-pre-wrap'>
                  {estimate.notes}
                </p>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}
      </motion.div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title='Elimina preventivo'
        description='Sei sicuro di voler eliminare questo preventivo? Questa azione non può essere annullata.'
        confirmLabel='Elimina'
        variant='danger'
        onConfirm={handleDelete}
      />
    </div>
  );
}
