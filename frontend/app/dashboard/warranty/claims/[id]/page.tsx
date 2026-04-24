'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  User,
  MessageSquare,
  Eye,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface WarrantyClaim {
  id: string;
  claimNumber: string;
  status: string;
  description: string;
  amount: number | null;
  approvedAmount?: number;
  submittedDate: string;
  reviewedDate?: string;
  resolvedDate?: string;
  evidencePhotos?: string[];
  warranty?: {
    warrantyNumber: string;
    coverageType: string;
    maxClaimAmount: number | null;
    deductibleAmount: number | null;
    vehicle?: { id: string; make: string; model: string; year: number; vin: string };
  };
}

enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

const statusConfig: Record<
  ClaimStatus,
  {
    label: string;
    color: string;
    icon: React.ReactNode;
    bgColor: string;
  }
> = {
  SUBMITTED: {
    label: 'Inviato',
    color: 'text-[var(--status-info)] dark:text-[var(--status-info)]',
    icon: <FileText className='h-5 w-5' />,
    bgColor: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]',
  },
  UNDER_REVIEW: {
    label: 'In Revisione',
    color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
    icon: <Clock className='h-5 w-5' />,
    bgColor: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)]',
  },
  APPROVED: {
    label: 'Approvato',
    color: 'text-[var(--status-success)] dark:text-[var(--status-success)]',
    icon: <CheckCircle2 className='h-5 w-5' />,
    bgColor: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]',
  },
  REJECTED: {
    label: 'Rifiutato',
    color: 'text-[var(--status-error)] dark:text-[var(--status-error)]',
    icon: <XCircle className='h-5 w-5' />,
    bgColor: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]',
  },
  PAID: {
    label: 'Pagato',
    color: 'text-[var(--brand)] dark:text-[var(--brand)]',
    icon: <DollarSign className='h-5 w-5' />,
    bgColor: 'bg-[var(--brand)]/10 dark:bg-[var(--brand-subtle)]',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimId = params.id as string;
  const autoReview = searchParams.get('action') === 'review';

  const [claim, setClaim] = React.useState<
    | (WarrantyClaim & {
        warranty?: {
          vehicle?: { make: string; model: string };
          provider: string;
          maxCoverage: number;
        };
      })
    | null
  >(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [isReviewing, setIsReviewing] = React.useState(false);

  // Review form state
  const [reviewDecision, setReviewDecision] = React.useState<'APPROVE' | 'REJECT' | null>(null);
  const [approvedAmount, setApprovedAmount] = React.useState('');
  const [reviewNotes, setReviewNotes] = React.useState('');

  React.useEffect(() => {
    loadClaim();
  }, [claimId]);

  React.useEffect(() => {
    if (autoReview && claim && claim.status === ClaimStatus.SUBMITTED) {
      setReviewDialogOpen(true);
    }
  }, [autoReview, claim]);

  const loadClaim = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/warranties/claims/${claimId}`);
      if (!res.ok) {
        toast.error('Reclamo non trovato', { description: 'Il reclamo richiesto non e stato trovato' });
        router.push('/dashboard/warranty/claims');
        return;
      }
      const json = await res.json();
      const data = json.data;
      setClaim(data);
      if (data?.approvedAmount) {
        setApprovedAmount(data.approvedAmount.toString());
      }
    } catch (error) {
      toast.error('Errore nel caricamento del reclamo', { description: error instanceof Error ? error.message : 'Errore sconosciuto' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewDecision) return;

    try {
      setIsReviewing(true);
      const reviewRes = await fetch(
        `/api/warranties/claims/${claimId}/${reviewDecision === 'APPROVE' ? 'approve' : 'reject'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: reviewDecision === 'APPROVE' ? parseFloat(approvedAmount) : undefined,
            notes: reviewNotes,
          }),
        }
      );
      if (!reviewRes.ok) {
        const err = await reviewRes.json();
        throw new Error(err.error || 'Revisione fallita');
      }
      toast.success(reviewDecision === 'APPROVE' ? 'Reclamo approvato' : 'Reclamo rifiutato', {
        description: reviewDecision === 'APPROVE'
          ? 'Il reclamo e stato approvato con successo'
          : 'Il reclamo e stato rifiutato',
      });
      setReviewDialogOpen(false);
      loadClaim();
    } catch (error) {
      toast.error('Errore nella revisione del reclamo', { description: error instanceof Error ? error.message : 'Errore sconosciuto' });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      const payRes = await fetch(`/api/warranties/claims/${claimId}/pay`, { method: 'POST' });
      if (!payRes.ok) throw new Error('Errore nel pagamento');
      toast.success('Reclamo pagato', { description: 'Il reclamo e stato contrassegnato come pagato' });
      loadClaim();
    } catch (error) {
      toast.error('Errore', { description: error instanceof Error ? error.message : 'Errore sconosciuto' });
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertCircle className='w-12 h-12 text-[var(--status-error)]/40 mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2'>
              Reclamo non trovato
            </h3>
            <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
              Il reclamo richiesto non esiste o e stato rimosso.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  const status = statusConfig[claim.status as ClaimStatus];
  const canReview =
    claim.status === ClaimStatus.SUBMITTED || claim.status === ClaimStatus.UNDER_REVIEW;
  const canPay = claim.status === ClaimStatus.APPROVED;

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-4 sm:px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Garanzie', href: '/dashboard/warranty' },
              { label: 'Reclami', href: '/dashboard/warranty/claims' },
              { label: claim.claimNumber },
            ]}
          />
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2'>
            <div className='flex items-center gap-3'>
              <AppleButton
                variant='ghost'
                size='sm'
                className='min-w-[44px] min-h-[44px]'
                onClick={() => router.push('/dashboard/warranty/claims')}
                icon={<ArrowLeft className='h-4 w-4' />}
              >
                <span className='sr-only'>Indietro</span>
              </AppleButton>
              <div>
                <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Dettaglio Reclamo
                </h1>
                <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                  Inviato il {formatDate(claim.submittedDate)}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {canReview && (
                <AppleButton
                  icon={<CheckCircle2 className='h-4 w-4' />}
                  onClick={() => setReviewDialogOpen(true)}
                >
                  Revisiona Reclamo
                </AppleButton>
              )}
              {canPay && (
                <AppleButton
                  variant='secondary'
                  icon={<DollarSign className='h-4 w-4' />}
                  onClick={handleMarkPaid}
                >
                  Segna come Pagato
                </AppleButton>
              )}
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className='p-4 sm:p-8 max-w-7xl mx-auto'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Status Card */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center gap-3'>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', status.bgColor)}>
                      <span className={status.color}>{status.icon}</span>
                    </div>
                    <div>
                      <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Stato Reclamo</h2>
                      <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${status.bgColor} ${status.color} mt-1 inline-block`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </AppleCardHeader>
                <AppleCardContent className='space-y-6'>
                  {/* Amounts */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] rounded-xl p-4'>
                      <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-1'>Costo Stimato</p>
                      <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {formatCurrency(claim.amount ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2 text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      <MessageSquare className='h-4 w-4' />
                      <span>Descrizione del Problema</span>
                    </div>
                    <div className='bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] p-4 rounded-xl'>
                      <p className='text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] whitespace-pre-wrap'>
                        {claim.description}
                      </p>
                    </div>
                  </div>

                  {/* Evidence */}
                  {claim.evidencePhotos && claim.evidencePhotos.length > 0 && (
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2 text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        <Eye className='h-4 w-4' />
                        <span>Foto Prove ({claim.evidencePhotos.length})</span>
                      </div>
                      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                        {claim.evidencePhotos.map((url, index) => (
                          <div
                            key={index}
                            className='aspect-video rounded-xl overflow-hidden bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] border border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50'
                          >
                            <img
                              src={url}
                              alt={`Foto allegata al reclamo ${index + 1}`}
                              className='w-full h-full object-cover'
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Review History */}
            {(claim.reviewedDate || claim.resolvedDate) && (
              <motion.div variants={listItemVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <div className='flex items-center gap-3'>
                      <Clock className='h-5 w-5 text-[var(--brand)]' />
                      <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        Storico Reclamo
                      </h2>
                    </div>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-4'>
                    {claim.reviewedDate && (
                      <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-xl bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)] flex items-center justify-center'>
                          <User className='h-4 w-4 text-[var(--status-info)] dark:text-[var(--status-info)]' />
                        </div>
                        <div>
                          <p className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Revisionato</p>
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                            il {formatDate(claim.reviewedDate)}
                          </p>
                        </div>
                      </div>
                    )}
                    {claim.resolvedDate && (
                      <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-xl bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] flex items-center justify-center'>
                          <CheckCircle2 className='h-4 w-4 text-[var(--status-success)]' />
                        </div>
                        <div>
                          <p className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Risolto</p>
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                            il {formatDate(claim.resolvedDate)}
                          </p>
                        </div>
                      </div>
                    )}
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Warranty Info */}
            <motion.div variants={listItemVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Informazioni Garanzia</h2>
                </AppleCardHeader>
                <AppleCardContent className='space-y-3'>
                  {claim.warranty?.vehicle && (
                    <>
                      <div className='flex justify-between'>
                        <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Veicolo</span>
                        <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {claim.warranty.vehicle.make} {claim.warranty.vehicle.model}
                        </span>
                      </div>
                      <div className='border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50' />
                    </>
                  )}
                  <div className='flex justify-between'>
                    <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Fornitore</span>
                    <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{claim.warranty?.provider}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Copertura Max</span>
                    <span className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      {formatCurrency(claim.warranty?.maxCoverage || 0)}
                    </span>
                  </div>
                  <div className='border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50' />
                  <AppleButton
                    variant='secondary'
                    className='w-full'
                    onClick={() =>
                      router.push(
                        `/dashboard/warranty/${(claim as unknown as { warrantyId: string }).warrantyId}`
                      )
                    }
                  >
                    Vedi Garanzia
                  </AppleButton>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Revisiona Reclamo</DialogTitle>
            <DialogDescription>Approva o rifiuta questo reclamo di garanzia</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            {/* Decision Buttons */}
            <div className='grid grid-cols-2 gap-3'>
              <button
                onClick={() => setReviewDecision('APPROVE')}
                className={cn(
                  'p-4 rounded-xl border-2 text-center transition-all min-h-[44px]',
                  reviewDecision === 'APPROVE'
                    ? 'border-apple-green bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]'
                    : 'border-[var(--border-default)]/30 dark:border-[var(--border-default)] hover:border-apple-green/50'
                )}
              >
                <Check
                  className={cn(
                    'h-6 w-6 mx-auto mb-2',
                    reviewDecision === 'APPROVE' ? 'text-[var(--status-success)]' : 'text-[var(--text-tertiary)]'
                  )}
                />
                <p
                  className={cn(
                    'font-medium',
                    reviewDecision === 'APPROVE' ? 'text-[var(--status-success)]' : 'text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                  )}
                >
                  Approva
                </p>
              </button>
              <button
                onClick={() => setReviewDecision('REJECT')}
                className={cn(
                  'p-4 rounded-xl border-2 text-center transition-all min-h-[44px]',
                  reviewDecision === 'REJECT'
                    ? 'border-[var(--status-error)] bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]'
                    : 'border-[var(--border-default)]/30 dark:border-[var(--border-default)] hover:border-[var(--status-error)]/50'
                )}
              >
                <X
                  className={cn(
                    'h-6 w-6 mx-auto mb-2',
                    reviewDecision === 'REJECT' ? 'text-[var(--status-error)]' : 'text-[var(--text-tertiary)]'
                  )}
                />
                <p
                  className={cn(
                    'font-medium',
                    reviewDecision === 'REJECT' ? 'text-[var(--status-error)]' : 'text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                  )}
                >
                  Rifiuta
                </p>
              </button>
            </div>

            {/* Approved Amount (only for approve) */}
            {reviewDecision === 'APPROVE' && (
              <div className='space-y-2'>
                <Label htmlFor='approvedAmount' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Importo Approvato (EUR)
                </Label>
                <Input
                  id='approvedAmount'
                  type='number'
                  min={0}
                  step='0.01'
                  placeholder='0.00'
                  value={approvedAmount}
                  onChange={e => setApprovedAmount(e.target.value)}
                  className='h-11 rounded-xl'
                />
                <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  Max: {formatCurrency(claim.warranty?.maxCoverage || 0)}
                </p>
              </div>
            )}

            {/* Review Notes */}
            <div className='space-y-2'>
              <Label htmlFor='notes' className='text-footnote font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Note di Revisione
              </Label>
              <Textarea
                id='notes'
                placeholder={
                  reviewDecision === 'REJECT' ? 'Motivo del rifiuto...' : 'Note aggiuntive...'
                }
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                className='rounded-xl'
              />
            </div>
          </div>
          <DialogFooter>
            <AppleButton variant='secondary' onClick={() => setReviewDialogOpen(false)}>
              Annulla
            </AppleButton>
            <AppleButton
              onClick={handleReview}
              disabled={
                !reviewDecision || (reviewDecision === 'APPROVE' && !approvedAmount) || isReviewing
              }
              className={cn(reviewDecision === 'REJECT' && 'bg-[var(--status-error)] hover:bg-[var(--status-error)]')}
            >
              {isReviewing ? <Loader2 className='w-4 h-4 animate-spin mr-2' /> : null}
              Conferma
            </AppleButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
