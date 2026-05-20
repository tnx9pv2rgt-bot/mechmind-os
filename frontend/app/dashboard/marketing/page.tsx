'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  Megaphone,
  Plus,
  Mail,
  MessageSquare,
  Send,
  Eye,
  MousePointerClick,
  Filter,
  AlertCircle,
  Loader2,
  TrendingUp,
  Users,
  Search,
} from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

interface Campaign {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'WHATSAPP';
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  recipientCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  createdAt: string;
  scheduledAt: string | null;
}

interface CampaignStats {
  activeCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  totalConversions: number;
}

interface CampaignsResponse {
  data: Campaign[];
  meta?: { total: number };
  stats?: CampaignStats;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: {
    color: 'text-[var(--text-primary)] dark:text-[var(--text-primary)]',
    bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)]',
    label: 'Bozza',
  },
  SCHEDULED: {
    color: 'text-[var(--status-info)] dark:text-[var(--status-info)]',
    bg: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]',
    label: 'Pianificata',
  },
  IN_PROGRESS: {
    color: 'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
    bg: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)]',
    label: 'In Corso',
  },
  COMPLETED: {
    color: 'text-[var(--status-success)] dark:text-[var(--status-success)]',
    bg: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)]',
    label: 'Completata',
  },
  CANCELLED: {
    color: 'text-[var(--status-error)] dark:text-[var(--status-error)]',
    bg: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)]',
    label: 'Annullata',
  },
};

const typeConfig: Record<string, { label: string; icon: typeof Mail }> = {
  EMAIL: { label: 'Email', icon: Mail },
  SMS: { label: 'SMS', icon: MessageSquare },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare },
};

type CampaignStatusFilter = 'ALL' | 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type CampaignTypeFilter = 'ALL' | 'EMAIL' | 'SMS' | 'WHATSAPP';

const statusOptions: { value: CampaignStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'SCHEDULED', label: 'Pianificata' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'COMPLETED', label: 'Completata' },
  { value: 'CANCELLED', label: 'Annullata' },
];

const typeOptions: { value: CampaignTypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Tutti i tipi' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
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

export default function MarketingCampaignsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CampaignTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const queryParams = new URLSearchParams();
  if (typeFilter !== 'ALL') queryParams.set('type', typeFilter);
  if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
  queryParams.set('page', String(page));
  queryParams.set('limit', String(PAGE_SIZE));

  const {
    data: campaignsData,
    error,
    isLoading,
    mutate,
  } = useSWR<CampaignsResponse>(
    `/api/dashboard/campaigns?${queryParams.toString()}`,
    fetcher
  );

  const campaigns: Campaign[] = (() => {
    if (!campaignsData) return [];
    const list = campaignsData.data || campaignsData;
    return Array.isArray(list) ? list : [];
  })();

  const stats: CampaignStats = campaignsData?.stats || {
    activeCampaigns: campaigns.filter(c => c.status === 'IN_PROGRESS' || c.status === 'SCHEDULED').length,
    totalSent: campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0),
    avgOpenRate: campaigns.length > 0
      ? campaigns.reduce((sum, c) => sum + (c.sentCount > 0 ? (c.openedCount / c.sentCount) * 100 : 0), 0) / campaigns.length
      : 0,
    totalConversions: campaigns.reduce((sum, c) => sum + (c.clickedCount || 0), 0),
  };

  const totalPages = campaignsData?.meta?.total
    ? Math.ceil(campaignsData.meta.total / PAGE_SIZE)
    : Math.ceil(campaigns.length / PAGE_SIZE) || 1;

  const filteredCampaigns = campaigns.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statCards = [
    {
      label: 'Campagne Attive',
      value: String(stats.activeCampaigns),
      icon: Megaphone,
      color: 'bg-[var(--brand)]',
    },
    {
      label: 'Email Inviate',
      value: String(stats.totalSent),
      icon: Send,
      color: 'bg-[var(--status-success)]',
    },
    {
      label: 'Tasso Apertura',
      value: `${stats.avgOpenRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-[var(--status-warning)]',
    },
    {
      label: 'Conversioni',
      value: String(stats.totalConversions),
      icon: MousePointerClick,
      color: 'bg-[var(--brand)]',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Campagne Marketing</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestisci campagne email, SMS e WhatsApp
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/marketing/new')}
          >
            Nuova Campagna
          </AppleButton>
        </div>
      </header>

      <motion.div
        className='p-8 space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Stats */}
        <motion.div
          className='grid grid-cols-2 lg:grid-cols-4 gap-bento'
          variants={containerVariants}
        >
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div
                      className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}
                    >
                      <stat.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                  <Input
                    placeholder='Cerca campagna per nome...'
                    aria-label='Cerca campagne'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none' />
                  <select
                    value={typeFilter}
                    onChange={e => { setTypeFilter(e.target.value as CampaignTypeFilter); setPage(1); }}
                    className='h-10 pl-10 pr-4 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    {typeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none' />
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value as CampaignStatusFilter); setPage(1); }}
                    className='h-10 pl-10 pr-4 rounded-md border border-[var(--border-default)]/30 dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Campaigns List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                Elenco Campagne
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {error ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Impossibile caricare le campagne
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => mutate()}
                  >
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <Megaphone className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Nessuna campagna. Crea la tua prima campagna marketing.
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => router.push('/dashboard/marketing/new')}
                  >
                    Crea la prima campagna
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {filteredCampaigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((campaign, index) => {
                    const status = statusConfig[campaign.status] || statusConfig.DRAFT;
                    const typeCfg = typeConfig[campaign.type] || typeConfig.EMAIL;
                    const TypeIcon = typeCfg.icon;

                    return (
                      <motion.div
                        key={campaign.id}
                        className='flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                        variants={listItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.005, x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                            <TypeIcon className='h-6 w-6 text-[var(--brand)]' />
                          </div>
                          <div>
                            <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {campaign.name}
                            </p>
                            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                              {typeCfg.label} &bull; {campaign.recipientCount} destinatari &bull; {campaign.sentCount} inviati
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <span
                            className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
                          >
                            {status.label}
                          </span>
                          <div className='hidden sm:flex items-center gap-3 text-right'>
                            <div>
                              <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Aperti</p>
                              <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                {campaign.openedCount}
                              </p>
                            </div>
                            <div>
                              <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Click</p>
                              <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                {campaign.clickedCount}
                              </p>
                            </div>
                          </div>
                          <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] min-w-[80px] text-right'>
                            {new Date(campaign.scheduledAt || campaign.createdAt).toLocaleDateString('it-IT')}
                          </p>
                          <AppleButton
                            variant='ghost'
                            size='sm'
                            icon={<Eye className='h-3.5 w-3.5' />}
                            onClick={() => router.push(`/dashboard/marketing/${campaign.id}`)}
                          >
                            Dettagli
                          </AppleButton>
                        </div>
                      </motion.div>
                    );
                  })}
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Segments Link */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div
                className='flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300 cursor-pointer'
                onClick={() => router.push('/dashboard/marketing/segments')}
              >
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center'>
                    <Users className='h-6 w-6 text-[var(--brand)]' />
                  </div>
                  <div>
                    <p className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                      Segmenti Clienti
                    </p>
                    <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      Crea e gestisci segmenti per targettizzare le campagne
                    </p>
                  </div>
                </div>
                <AppleButton
                  variant='ghost'
                  size='sm'
                  onClick={() => router.push('/dashboard/marketing/segments')}
                >
                  Gestisci
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
