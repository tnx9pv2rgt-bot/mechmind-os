'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  Calendar,
  Edit2,
  Trash2,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Euro,
  Gauge,
  Loader2,
  AlertCircle,
  Car,
  Clock,
  DollarSign,
  TrendingDown,
} from 'lucide-react';

import { formatCurrency, formatDate } from '@/lib/utils';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { z } from 'zod';
import { ClaimForm, ClaimCard, RemainingCoverage } from '@/components/warranty';
import type { WarrantyWithClaims, WarrantyClaim } from '@/lib/services/warrantyService';
import { WarrantyStatus, ClaimStatus, WarrantyType } from '@/lib/services/warrantyService';

const fileClaimSchema = z.object({
  issueDescription: z.string().min(1, 'La descrizione del problema è obbligatoria'),
  estimatedCost: z.number().min(0, 'Il costo stimato non può essere negativo'),
  evidence: z.array(z.string()).optional(),
});

interface FileClaimDTO {
  issueDescription: string;
  estimatedCost: number;
  evidence?: string[];
}

type ClaimWithApproved = WarrantyClaim & { approvedAmount?: number };

const statusConfig: Partial<Record<WarrantyStatus, { label: string; bg: string; color: string }>> = {
  ACTIVE: { label: 'Attiva', bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-green-700 dark:text-green-300' },
  EXPIRING_SOON: { label: 'In Scadenza', bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-700 dark:text-amber-300' },
  EXPIRED: { label: 'Scaduta', bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-700 dark:text-red-300' },
  VOID: { label: 'Annullata', bg: 'bg-apple-light-gray dark:bg-[var(--surface-hover)]', color: 'text-apple-dark dark:text-[var(--text-secondary)]' },
  PENDING: { label: 'In Attesa', bg: 'bg-yellow-100 dark:bg-yellow-900/40', color: 'text-yellow-700 dark:text-yellow-300' },
  CLAIMED: { label: 'Reclamata', bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-700 dark:text-blue-300' },
};

const typeConfig: Record<WarrantyType, { label: string }> = {
  MANUFACTURER: { label: 'Costruttore' },
  EXTENDED: { label: 'Estesa' },
  DEALER: { label: 'Concessionario' },
  AS_IS: { label: "Così com'è" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function calculateProgress(startDate: Date | string, expirationDate: Date | string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(expirationDate).getTime();
  const now = new Date().getTime();

  if (now >= end) return 100;
  if (now <= start) return 0;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

function calculateDaysRemaining(expirationDate: Date | string): number {
  const now = new Date().getTime();
  const expiry = new Date(expirationDate).getTime();
  const diff = expiry - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type TabKey = 'overview' | 'claims' | 'vehicle';

export default function WarrantyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const warrantyId = params.id as string;

  const [warranty, setWarranty] = React.useState<(WarrantyWithClaims & { claims: ClaimWithApproved[] }) | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmittingClaim, setIsSubmittingClaim] = React.useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>('overview');

  React.useEffect(() => {
    loadWarranty();
  }, [warrantyId]);

  const loadWarranty = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/warranties/${warrantyId}`);
      if (!res.ok) {
        toast.error('Garanzia non trovata');
        router.push('/dashboard/warranty');
        return;
      }
      const json = await res.json();
      setWarranty(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nel caricamento della garanzia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClaim = async (data: FileClaimDTO): Promise<void> => {
    const result = fileClaimSchema.safeParse(data);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    try {
      setIsSubmittingClaim(true);
      const claimRes = await fetch(`/api/warranties/${warrantyId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!claimRes.ok) {
        const err = await claimRes.json();
        throw new Error(err.error || "Errore nell'invio del reclamo");
      }
      toast.success('Reclamo inviato con successo');
      setClaimDialogOpen(false);
      loadWarranty();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nell'invio del reclamo");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleDeleteWarranty = async (): Promise<void> => {
    try {
      const delRes = await fetch(`/api/warranties/${warrantyId}`, { method: 'DELETE' });
      if (!delRes.ok) {
        const err = await delRes.json();
        throw new Error(err.error || "Errore nell'eliminazione della garanzia");
      }
      toast.success('Garanzia eliminata con successo');
      router.push('/dashboard/warranty');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nell'eliminazione");
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (!warranty) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center'>
        <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
        <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
          Garanzia non trovata
        </p>
        <AppleButton variant='secondary' onClick={() => router.push('/dashboard/warranty')}>
          Torna alle garanzie
        </AppleButton>
      </div>
    );
  }

  const status = statusConfig[warranty.status as WarrantyStatus] || {
    label: 'Sconosciuto',
    bg: 'bg-apple-light-gray dark:bg-[var(--surface-hover)]',
    color: 'text-apple-dark dark:text-[var(--text-secondary)]',
  };
  const type = typeConfig[(warranty.coverageType as WarrantyType) || WarrantyType.MANUFACTURER];
  const progress = calculateProgress(warranty.startDate, warranty.expirationDate);
  const daysRemaining = calculateDaysRemaining(warranty.expirationDate);

  const totalClaimed = warranty.claims?.reduce((sum, c) => sum + (c.approvedAmount || 0), 0) || 0;
  const remainingCoverage = (warranty.maxClaimAmount || 0) - totalClaimed;

  const pendingClaims =
    warranty.claims?.filter(
      c => c.status === ClaimStatus.SUBMITTED || c.status === ClaimStatus.UNDER_REVIEW
    ) || [];
  const approvedClaims =
    warranty.claims?.filter(
      c => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID
    ) || [];
  const rejectedClaims = warranty.claims?.filter(c => c.status === ClaimStatus.REJECTED) || [];

  const canFileClaim =
    warranty.status !== WarrantyStatus.EXPIRED && warranty.status !== WarrantyStatus.VOID;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Panoramica' },
    { key: 'claims', label: `Reclami (${warranty.claims?.length || 0})` },
    { key: 'vehicle', label: 'Veicolo' },
  ];

  const [claimFilter, setClaimFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredClaims = (() => {
    switch (claimFilter) {
      case 'pending': return pendingClaims;
      case 'approved': return approvedClaims;
      case 'rejected': return rejectedClaims;
      default: return warranty.claims || [];
    }
  })();

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Garanzie', href: '/dashboard/warranty' },
              { label: warranty.warrantyNumber },
            ]}
          />
          <div className='flex items-center justify-between mt-1'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-xl bg-apple-green/10 flex items-center justify-center'>
                <Shield className='h-6 w-6 text-apple-green' />
              </div>
              <div>
                <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>
                  Garanzia {warranty.vehicle?.make} {warranty.vehicle?.model}
                </h1>
                <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                  {type?.label || 'Garanzia'} &bull; {warranty.warrantyNumber}
                </p>
              </div>
              <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <AppleButton variant='secondary' size='sm' icon={<Edit2 className='h-4 w-4' />}>
                Modifica
              </AppleButton>
              <AppleButton
                variant='ghost'
                size='sm'
                className='text-apple-red hover:opacity-80'
                icon={<Trash2 className='h-4 w-4' />}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Elimina
              </AppleButton>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className='border-b border-apple-border/20 dark:border-[var(--border-default)]/50 bg-white/60 dark:bg-[var(--surface-primary)]/60'>
        <div className='px-8 flex gap-1'>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-body font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-apple-blue text-apple-blue'
                  : 'border-transparent text-apple-gray dark:text-[var(--text-secondary)] hover:text-apple-dark dark:hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants} key={activeTab}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stat Cards */}
            <motion.div className='grid grid-cols-2 lg:grid-cols-4 gap-4' variants={containerVariants}>
              {[
                { label: 'Copertura Max', value: formatCurrency(warranty.maxClaimAmount || 0), icon: Euro, color: 'bg-apple-blue' },
                { label: 'Franchigia', value: formatCurrency(warranty.deductibleAmount || 0), icon: Euro, color: 'bg-apple-orange' },
                { label: 'Copertura Km', value: warranty.mileageLimit ? `${warranty.mileageLimit.toLocaleString()} km` : 'Illimitata', icon: Gauge, color: 'bg-apple-green' },
                { label: 'Reclami', value: String(warranty.claims?.length || 0), icon: FileText, color: 'bg-apple-purple' },
              ].map(stat => (
                <motion.div key={stat.label} variants={cardVariants}>
                  <AppleCard hover={false}>
                    <AppleCardContent>
                      <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                        <stat.icon className='h-5 w-5 text-white' />
                      </div>
                      <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>{stat.value}</p>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{stat.label}</p>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              ))}
            </motion.div>

            {/* Status + Progress Card */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <Shield className='h-5 w-5 text-apple-gray' /> Stato Garanzia
                  </h2>
                </AppleCardHeader>
                <AppleCardContent className='space-y-6'>
                  {/* Progress Bar */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-body'>
                      <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Periodo di Copertura</span>
                      <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        {progress}% trascorso
                      </span>
                    </div>
                    <div className='w-full h-2 bg-apple-light-gray dark:bg-[var(--surface-hover)] rounded-full overflow-hidden'>
                      <div
                        className='h-full bg-apple-blue rounded-full transition-all duration-500'
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className='flex items-center justify-between text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                      <span>{formatDate(warranty.startDate)}</span>
                      <span>{formatDate(warranty.expirationDate)}</span>
                    </div>
                  </div>

                  {/* Days Remaining */}
                  {warranty.status !== WarrantyStatus.EXPIRED &&
                    warranty.status !== WarrantyStatus.VOID && (
                      <div
                        className={`flex items-center gap-3 p-4 rounded-xl ${
                          daysRemaining <= 30
                            ? 'bg-red-100/60 dark:bg-red-900/20'
                            : daysRemaining <= 60
                              ? 'bg-amber-100/60 dark:bg-amber-900/20'
                              : 'bg-green-100/60 dark:bg-green-900/20'
                        }`}
                      >
                        <Calendar
                          className={`h-5 w-5 ${
                            daysRemaining <= 30
                              ? 'text-apple-red'
                              : daysRemaining <= 60
                                ? 'text-apple-orange'
                                : 'text-apple-green'
                          }`}
                        />
                        <div>
                          <p
                            className={`font-medium ${
                              daysRemaining <= 30
                                ? 'text-red-800 dark:text-red-300'
                                : daysRemaining <= 60
                                  ? 'text-amber-800 dark:text-amber-300'
                                  : 'text-green-800 dark:text-green-300'
                            }`}
                          >
                            {daysRemaining > 0 ? `${daysRemaining} giorni rimanenti` : 'Scade oggi'}
                          </p>
                          <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                            Scade il {formatDate(warranty.expirationDate)}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Coverage Details */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='p-4 rounded-xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]'>
                      <div className='flex items-center gap-2 text-body text-apple-gray dark:text-[var(--text-secondary)] mb-1'>
                        <Euro className='h-4 w-4' />
                        <span>Copertura Residua</span>
                      </div>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                        {formatCurrency(remainingCoverage > 0 ? remainingCoverage : 0)}
                      </p>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        di {formatCurrency(warranty.maxClaimAmount || 0)} totali
                      </p>
                    </div>
                    <div className='p-4 rounded-xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]'>
                      <div className='flex items-center gap-2 text-body text-apple-gray dark:text-[var(--text-secondary)] mb-1'>
                        <TrendingDown className='h-4 w-4' />
                        <span>Utilizzato</span>
                      </div>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                        {formatCurrency(totalClaimed)}
                      </p>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        in {warranty.claims?.length || 0} reclami
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <>
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                      <FileText className='h-5 w-5 text-apple-gray' /> Storico Reclami
                    </h2>
                    {canFileClaim && (
                      <AppleButton size='sm' icon={<Plus className='h-4 w-4' />} onClick={() => setClaimDialogOpen(true)}>
                        Invia Reclamo
                      </AppleButton>
                    )}
                  </div>
                </AppleCardHeader>
                <AppleCardContent>
                  {/* Filter Pills */}
                  <div className='flex gap-2 mb-6'>
                    {[
                      { key: 'all' as const, label: `Tutti (${warranty.claims?.length || 0})` },
                      { key: 'pending' as const, label: `In Attesa (${pendingClaims.length})` },
                      { key: 'approved' as const, label: `Approvati (${approvedClaims.length})` },
                      { key: 'rejected' as const, label: `Rifiutati (${rejectedClaims.length})` },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setClaimFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-body font-medium transition-colors ${
                          claimFilter === f.key
                            ? 'bg-apple-blue text-white'
                            : 'text-apple-gray dark:text-[var(--text-secondary)] hover:bg-apple-light-gray/50 dark:hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {filteredClaims.length === 0 ? (
                    <div className='text-center py-12'>
                      <FileText className='h-12 w-12 text-apple-gray/40 mx-auto mb-4' />
                      <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                        Nessun reclamo trovato
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {filteredClaims.map(claim => (
                        <ClaimCard
                          key={claim.id}
                          claim={claim}
                          onClick={() => router.push(`/dashboard/warranty/claims/${claim.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </>
        )}

        {/* Vehicle Tab */}
        {activeTab === 'vehicle' && (
          <>
            {/* Remaining Coverage */}
            <motion.div variants={cardVariants}>
              <RemainingCoverage
                maxCoverage={warranty.maxClaimAmount || 0}
                usedCoverage={totalClaimed}
                coverageKm={warranty.mileageLimit}
                currentKm={0}
                startKm={0}
              />
            </motion.div>

            {/* Vehicle Info */}
            {warranty.vehicle && (
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                      <Car className='h-5 w-5 text-apple-gray' /> Informazioni Veicolo
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent>
                    <div className='space-y-3'>
                      {[
                        { label: 'Marca', value: warranty.vehicle.make },
                        { label: 'Modello', value: warranty.vehicle.model },
                        { label: 'Anno', value: String(warranty.vehicle.year) },
                        { label: 'VIN', value: warranty.vehicle.vin },
                      ].map(row => (
                        <div key={row.label} className='flex items-center justify-between py-2 border-b border-apple-border/20 dark:border-[var(--border-default)]/50'>
                          <span className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{row.label}</span>
                          <span className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* File Claim Dialog */}
      {claimDialogOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[var(--surface-elevated)] rounded-2xl shadow-2xl p-6 m-4'
          >
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Invia un Reclamo
              </h2>
              <button
                onClick={() => setClaimDialogOpen(false)}
                className='p-2 rounded-lg hover:bg-apple-light-gray dark:hover:bg-[var(--surface-active)]'
                aria-label='Chiudi'
              >
                <XCircle className='h-5 w-5 text-apple-gray' />
              </button>
            </div>
            <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
              Invia un nuovo reclamo per questa garanzia
            </p>
            <ClaimForm
              warrantyId={warrantyId}
              maxClaimAmount={remainingCoverage}
              deductible={warranty.deductibleAmount || 0}
              onSubmit={handleFileClaim}
              onCancel={() => setClaimDialogOpen(false)}
              isLoading={isSubmittingClaim}
            />
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title='Elimina garanzia'
        description='Sei sicuro di voler eliminare questa garanzia? Questa azione non può essere annullata.'
        confirmLabel='Elimina'
        variant='danger'
        onConfirm={handleDeleteWarranty}
      />
    </div>
  );
}
