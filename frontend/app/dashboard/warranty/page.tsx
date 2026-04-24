'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import Link from 'next/link';
import { Shield, Plus, FileText, AlertTriangle, Calendar, TrendingUp, Car, ArrowLeft, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { z } from 'zod';

import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { WarrantyCard, ClaimsList, ExpiringAlert, WarrantyForm } from '@/components/warranty';
import type { WarrantyWithClaims, WarrantyClaim } from '@/lib/services/warrantyService';
import { WarrantyStatus } from '@/lib/services/warrantyService';

const createWarrantySchema = z.object({
  vehicleId: z.string().min(1, 'Seleziona un veicolo'),
  type: z.string().min(1, 'Seleziona il tipo di garanzia'),
  provider: z.string().min(1, 'Inserisci il fornitore'),
  startDate: z.date({ required_error: 'La data di inizio è obbligatoria' }),
  expirationDate: z.date({ required_error: 'La data di scadenza è obbligatoria' }),
  currentKm: z.number().min(0, 'I km attuali non possono essere negativi'),
  maxCoverage: z.number().min(0, 'La copertura massima non può essere negativa'),
  deductible: z.number().min(0, 'La franchigia non può essere negativa'),
  coverageKm: z.number().min(0, 'I km di copertura non possono essere negativi').nullable().optional(),
  terms: z.string().optional(),
  certificateUrl: z.string().optional(),
});

type ClaimWithVehicle = WarrantyClaim & { warranty?: { vehicle?: { make: string; model: string } } };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
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

export default function WarrantyDashboardPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'warranties' | 'claims'>('warranties');
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;

  const {
    data: warrantiesData,
    error: warrantiesError,
    isLoading: warrantiesLoading,
    mutate: mutateWarranties,
  } = useSWR<{ data?: WarrantyWithClaims[] }>('/api/warranties', fetcher);
  const {
    data: claimsData,
    isLoading: claimsLoading,
    mutate: mutateClaims,
  } = useSWR<{
    data?: ClaimWithVehicle[];
  }>('/api/warranties/claims', fetcher);
  const {
    data: expiringData,
    isLoading: expiringLoading,
    mutate: mutateExpiring,
  } = useSWR<{ data?: WarrantyWithClaims[] }>('/api/warranties/expiring?days=60', fetcher);

  const warranties = warrantiesData?.data || [];
  const claims = claimsData?.data || [];
  const expiringWarranties = expiringData?.data || [];
  const isLoading = warrantiesLoading || claimsLoading || expiringLoading;

  React.useEffect(() => {
    if (warrantiesError) {
      toast.error('Errore nel caricamento', {
        description:
          warrantiesError instanceof Error ? warrantiesError.message : 'Errore sconosciuto',
      });
    }
  }, [warrantiesError]);

  const handleCreateWarranty = async (data: {
    vehicleId: string;
    type: string;
    provider: string;
    startDate: Date;
    expirationDate: Date;
    currentKm: number;
    maxCoverage: number;
    deductible: number;
    coverageKm?: number | null;
    terms?: string;
    certificateUrl?: string;
  }) => {
    const result = createWarrantySchema.safeParse(data);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    try {
      setIsCreating(true);
      const res = await fetch('/api/warranties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore nella creazione della garanzia');
      }
      toast.success('Garanzia creata con successo');
      setCreateDialogOpen(false);
      mutateWarranties();
      mutateClaims();
      mutateExpiring();
    } catch (error) {
      toast.error('Errore nella creazione', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Calculate stats
  const stats = React.useMemo(() => {
    const active = warranties.filter(w => w.status === WarrantyStatus.ACTIVE).length;
    const expiringSoon = warranties.filter(w => w.status === WarrantyStatus.EXPIRING_SOON).length;
    const expired = warranties.filter(w => w.status === WarrantyStatus.EXPIRED).length;
    const pendingClaims = claims.filter(
      c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW'
    ).length;

    return { active, expiringSoon, expired, pendingClaims };
  }, [warranties, claims]);

  const statCards = [
    { label: 'Garanzie Attive', value: String(stats.active), icon: Shield, color: 'bg-[var(--status-success)]' },
    { label: 'In Scadenza', value: String(stats.expiringSoon), icon: Calendar, color: 'bg-[var(--status-warning)]' },
    { label: 'Scadute', value: String(stats.expired), icon: AlertTriangle, color: 'bg-[var(--status-error)]' },
    { label: 'Reclami in Attesa', value: String(stats.pendingClaims), icon: FileText, color: 'bg-[var(--brand)]' },
  ];

  const tabs = [
    { key: 'warranties' as const, label: 'Garanzie' },
    { key: 'claims' as const, label: 'Reclami' },
  ];

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-full py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Gestione Garanzie</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>Monitora le garanzie e gestisci i reclami</p>
          </div>
          <div className='flex items-center gap-3'>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <AppleButton variant='primary' icon={<Plus className='h-4 w-4' />}>
                  Nuova Garanzia
                </AppleButton>
              </DialogTrigger>
              <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
                <DialogHeader>
                  <DialogTitle>Nuova Garanzia</DialogTitle>
                  <DialogDescription>Aggiungi una nuova garanzia per un veicolo</DialogDescription>
                </DialogHeader>
                <WarrantyForm
                  onSubmit={handleCreateWarranty}
                  onCancel={() => setCreateDialogOpen(false)}
                  isLoading={isCreating}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <motion.div className='p-4 sm:p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Expiring Alert */}
        {expiringWarranties.length > 0 && (
          <motion.div variants={listItemVariants}>
            <ExpiringAlert
              warranties={expiringWarranties}
              onViewAll={() => router.push('/dashboard/warranty?tab=expiring')}
              onViewWarranty={id => router.push(`/dashboard/warranty/${id}`)}
            />
          </motion.div>
        )}

        {/* Stats */}
        <motion.div className='grid grid-cols-2 lg:grid-cols-4 gap-bento' variants={containerVariants}>
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {stat.value}
                  </p>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div variants={listItemVariants} className='flex justify-center flex-wrap gap-2'>
          {tabs.map(tab => (
            <AppleButton
              key={tab.key}
              variant={activeTab === tab.key ? 'primary' : 'ghost'}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
            >
              {tab.label}
            </AppleButton>
          ))}
        </motion.div>

        {/* Warranties Tab */}
        {activeTab === 'warranties' && (
          <motion.div variants={listItemVariants}>
            {warranties.length === 0 ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <Shield className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      Nessuna garanzia. Crea una garanzia per iniziare.
                    </p>
                    <AppleButton
                      variant='ghost'
                      className='mt-4'
                      icon={<Plus className='h-4 w-4' />}
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Crea Garanzia
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : (
              <>
                <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
                  {warranties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(warranty => (
                    <WarrantyCard
                      key={warranty.id}
                      warranty={warranty}
                      onClick={() => router.push(`/dashboard/warranty/${warranty.id}`)}
                    />
                  ))}
                </div>
                <div className='mt-4'>
                  <Pagination page={page} totalPages={Math.ceil(warranties.length / PAGE_SIZE)} onPageChange={setPage} />
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <motion.div variants={listItemVariants}>
            <ClaimsList
              claims={claims}
              showVehicle
              onClaimClick={claim => router.push(`/dashboard/warranty/claims/${claim.id}`)}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
