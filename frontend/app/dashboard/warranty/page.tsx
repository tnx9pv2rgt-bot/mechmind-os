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

const colors = {
  bg: '#1a1a1a',
  surface: '#2f2f2f',
  surfaceHover: '#383838',
  border: '#4e4e4e',
  borderSubtle: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#b4b4b4',
  textTertiary: '#888888',
  textMuted: '#666666',
  accent: '#ffffff',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  purple: '#a78bfa',
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
};

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
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
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
    { label: 'Garanzie Attive', value: stats.active, icon: Shield, iconColor: colors.success },
    { label: 'In Scadenza', value: stats.expiringSoon, icon: Calendar, iconColor: colors.warning },
    { label: 'Scadute', value: stats.expired, icon: AlertTriangle, iconColor: colors.error },
    { label: 'Reclami in Attesa', value: stats.pendingClaims, icon: FileText, iconColor: colors.info },
  ];

  const tabs = [
    { key: 'warranties' as const, label: 'Garanzie' },
    { key: 'claims' as const, label: 'Reclami' },
  ];

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{ backgroundColor: colors.bg }}>
        <Loader2 className='h-8 w-8 animate-spin' style={{ color: colors.textMuted }} />
      </div>
    );
  }

  return (
    <div className='min-h-screen' style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className='sticky top-0 z-30 backdrop-blur-xl border-b'
        style={{ backgroundColor: `${colors.bg}cc`, borderColor: colors.borderSubtle }}
      >
        <div className='px-8 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link href='/dashboard'>
              <button
                className='w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5'
                style={{ color: colors.textSecondary }}
              >
                <ArrowLeft className='h-5 w-5' />
              </button>
            </Link>
            <div>
              <h1 className='text-[28px] font-light' style={{ color: colors.textPrimary }}>
                Gestione Garanzie
              </h1>
              <p className='text-[13px] mt-0.5' style={{ color: colors.textTertiary }}>
                Monitora le garanzie e gestisci i reclami
              </p>
            </div>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <button
                className='h-10 px-5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-90'
                style={{ backgroundColor: colors.accent, color: colors.bg }}
              >
                <Plus className='h-4 w-4' />
                Nuova Garanzia
              </button>
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
      </header>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Expiring Alert */}
        {expiringWarranties.length > 0 && (
          <motion.div variants={itemVariants}>
            <ExpiringAlert
              warranties={expiringWarranties}
              onViewAll={() => router.push('/dashboard/warranty?tab=expiring')}
              onViewWarranty={id => router.push(`/dashboard/warranty/${id}`)}
            />
          </motion.div>
        )}

        {/* Stats */}
        <motion.div className='grid grid-cols-2 lg:grid-cols-4 gap-4' variants={containerVariants}>
          {statCards.map(stat => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className='rounded-2xl border h-[120px] flex flex-col justify-center px-5'
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className='flex items-center gap-3 mb-3'>
                <div
                  className='w-10 h-10 rounded-xl flex items-center justify-center'
                  style={{ backgroundColor: `${stat.iconColor}15` }}
                >
                  <stat.icon className='h-5 w-5' style={{ color: stat.iconColor }} />
                </div>
              </div>
              <p
                className='text-2xl font-semibold'
                style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
              >
                {stat.value}
              </p>
              <p className='text-[13px]' style={{ color: colors.textTertiary }}>{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} className='flex justify-center flex-wrap gap-2'>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className='h-10 px-4 rounded-full text-sm font-medium transition-colors'
              style={activeTab === tab.key
                ? { backgroundColor: colors.accent, color: colors.bg }
                : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, color: colors.textSecondary }
              }
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Warranties Tab */}
        {activeTab === 'warranties' && (
          <motion.div variants={itemVariants}>
            {warranties.length === 0 ? (
              <div
                className='rounded-2xl border flex flex-col items-center justify-center py-16 text-center'
                style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              >
                <div
                  className='w-16 h-16 rounded-2xl flex items-center justify-center mb-4'
                  style={{ backgroundColor: `${colors.success}15` }}
                >
                  <Shield className='h-8 w-8' style={{ color: colors.borderSubtle }} />
                </div>
                <p className='text-base font-medium mb-1' style={{ color: colors.textPrimary }}>
                  Nessuna garanzia
                </p>
                <p className='text-[13px] max-w-sm mb-6' style={{ color: colors.textTertiary }}>
                  Crea una garanzia per iniziare a monitorare la copertura
                </p>
                <button
                  className='h-10 px-5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-90'
                  style={{ backgroundColor: colors.accent, color: colors.bg }}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className='h-4 w-4' />
                  Crea Garanzia
                </button>
              </div>
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
          <motion.div variants={itemVariants}>
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
