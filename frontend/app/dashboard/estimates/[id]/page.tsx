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
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
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
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-200 dark:bg-gray-700',
    label: 'Bozza',
  },
  SENT: {
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Inviato',
  },
  ACCEPTED: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/40',
    label: 'Accettato',
  },
  REJECTED: {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/40',
    label: 'Rifiutato',
  },
  EXPIRED: {
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    label: 'Scaduto',
  },
  CONVERTED: {
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
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
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <AlertCircle className='h-12 w-12 text-red-400 mb-4' />
        <p className='text-body text-apple-gray dark:text-[#636366] mb-4'>
          {error || 'Preventivo non trovato'}
        </p>
        <AppleButton
          variant='secondary'
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
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50 no-print'>
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
              <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>
                {estimate.number || `Preventivo #${id.slice(0, 8)}`}
              </h1>
              <span
                className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
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
                    className='text-red-500 hover:text-red-600'
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
        <div className='mx-8 mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 no-print'>
          <AlertCircle className='h-4 w-4 text-red-500 flex-shrink-0' />
          <p className='text-xs text-red-700 dark:text-red-300'>{actionError}</p>
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
                  <User className='h-4 w-4 text-apple-gray' />
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Cliente
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <p className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                  {estimate.customerName}
                </p>
                {estimate.customerEmail && (
                  <p className='text-footnote text-apple-gray dark:text-[#636366]'>
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
                  <Car className='h-4 w-4 text-apple-gray' />
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Veicolo
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                <p className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                  {estimate.vehicleMake} {estimate.vehicleModel}
                </p>
                <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                  {estimate.vehiclePlate}
                </p>
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center gap-2'>
                  <Calendar className='h-4 w-4 text-apple-gray' />
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                    Date
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-apple-gray dark:text-[#636366]'>Creato</span>
                  <span className='font-medium text-apple-dark dark:text-[#ececec]'>
                    {new Date(estimate.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
                {estimate.validUntil && (
                  <div className='flex justify-between text-sm'>
                    <span className='text-apple-gray dark:text-[#636366]'>Valido fino al</span>
                    <span className='font-medium text-apple-dark dark:text-[#ececec]'>
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
                <FileText className='h-4 w-4 text-apple-gray' />
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Dettaglio Righe
                </h2>
              </div>
            </AppleCardHeader>
            <AppleCardContent>
              {/* Header */}
              <div className='grid grid-cols-12 gap-3 pb-3 border-b border-apple-border/30 dark:border-[#424242] mb-3'>
                <div className='col-span-1 text-xs font-medium uppercase text-apple-gray'>Tipo</div>
                <div className='col-span-5 text-xs font-medium uppercase text-apple-gray'>
                  Descrizione
                </div>
                <div className='col-span-1 text-xs font-medium uppercase text-apple-gray text-right'>
                  Qta
                </div>
                <div className='col-span-2 text-xs font-medium uppercase text-apple-gray text-right'>
                  Prezzo
                </div>
                <div className='col-span-1 text-xs font-medium uppercase text-apple-gray text-right'>
                  IVA
                </div>
                <div className='col-span-2 text-xs font-medium uppercase text-apple-gray text-right'>
                  Totale
                </div>
              </div>

              <div className='space-y-1'>
                {(estimate.lines || []).map(line => (
                  <div
                    key={line.id}
                    className='grid grid-cols-12 gap-3 py-2 px-2 rounded-xl hover:bg-apple-light-gray/30 dark:hover:bg-[#353535] transition-colors'
                  >
                    <div className='col-span-1'>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          line.type === 'LABOR'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                        }`}
                      >
                        {line.type === 'LABOR' ? 'LAV' : 'RIC'}
                      </span>
                    </div>
                    <div className='col-span-5 text-sm text-apple-dark dark:text-[#ececec]'>
                      {line.description}
                    </div>
                    <div className='col-span-1 text-sm text-right text-apple-dark dark:text-[#ececec]'>
                      {line.quantity}
                    </div>
                    <div className='col-span-2 text-sm text-right text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(line.unitPrice)}
                    </div>
                    <div className='col-span-1 text-sm text-right text-apple-gray dark:text-[#636366]'>
                      {line.taxRate}%
                    </div>
                    <div className='col-span-2 text-sm text-right font-medium text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(line.total || line.quantity * line.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </AppleCardContent>

            <AppleCardFooter>
              <div className='flex justify-end'>
                <div className='w-full max-w-xs space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-apple-gray dark:text-[#636366]'>Subtotale</span>
                    <span className='font-medium text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(estimate.subtotal)}
                    </span>
                  </div>
                  {estimate.discount > 0 && (
                    <div className='flex justify-between text-sm'>
                      <span className='text-apple-gray dark:text-[#636366]'>Sconto</span>
                      <span className='font-medium text-red-500'>
                        -{formatCurrency(estimate.discount)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between text-sm'>
                    <span className='text-apple-gray dark:text-[#636366]'>IVA</span>
                    <span className='font-medium text-apple-dark dark:text-[#ececec]'>
                      {formatCurrency(estimate.taxAmount)}
                    </span>
                  </div>
                  <div className='border-t border-apple-border/30 dark:border-[#424242] pt-2'>
                    <div className='flex justify-between'>
                      <span className='text-base font-semibold text-apple-dark dark:text-[#ececec]'>
                        Totale
                      </span>
                      <span className='text-base font-bold text-apple-dark dark:text-[#ececec]'>
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
                <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                  Note
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                <p className='text-sm text-apple-gray dark:text-[#636366] whitespace-pre-wrap'>
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
