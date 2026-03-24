'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Pagination } from '@/components/ui/pagination';
import {
  Megaphone,
  Plus,
  Mail,
  MessageSquare,
  Send,
  Eye,
  MousePointerClick,
  Calendar,
  Filter,
  AlertCircle,
  Loader2,
  TrendingUp,
  Users,
  BarChart3,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; barColor: string }> = {
  DRAFT: { label: 'Bozza', color: colors.textTertiary, barColor: colors.textMuted },
  SCHEDULED: { label: 'Pianificata', color: colors.info, barColor: colors.info },
  IN_PROGRESS: { label: 'In Corso', color: colors.warning, barColor: colors.warning },
  COMPLETED: { label: 'Completata', color: colors.success, barColor: colors.success },
  CANCELLED: { label: 'Annullata', color: colors.error, barColor: colors.error },
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Mail }> = {
  EMAIL: { label: 'Email', icon: Mail },
  SMS: { label: 'SMS', icon: MessageSquare },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function MarketingCampaignsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const queryParams = new URLSearchParams();
  if (typeFilter) queryParams.set('type', typeFilter);
  if (statusFilter) queryParams.set('status', statusFilter);
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

  const statCards = [
    { label: 'Campagne Attive', value: String(stats.activeCampaigns), icon: Megaphone, iconColor: colors.purple },
    { label: 'Email Inviate', value: String(stats.totalSent), icon: Send, iconColor: colors.success },
    { label: 'Tasso Apertura', value: `${stats.avgOpenRate.toFixed(1)}%`, icon: TrendingUp, iconColor: colors.warning },
    { label: 'Conversioni', value: String(stats.totalConversions), icon: MousePointerClick, iconColor: colors.info },
  ];

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
                Campagne Marketing
              </h1>
              <p className='text-[13px] mt-0.5' style={{ color: colors.textTertiary }}>
                Gestisci campagne email, SMS e WhatsApp
              </p>
            </div>
          </div>
          <Link href='/dashboard/marketing/new'>
            <button
              className='h-10 px-5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-90'
              style={{ backgroundColor: colors.accent, color: colors.bg }}
            >
              <Plus className='h-4 w-4' />
              Nuova Campagna
            </button>
          </Link>
        </div>
      </header>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Stats Row */}
        <motion.div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' variants={containerVariants}>
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
                {isLoading ? '...' : stat.value}
              </p>
              <p className='text-[13px]' style={{ color: colors.textTertiary }}>{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className='flex justify-center flex-wrap gap-3'>
          <div className='flex items-center gap-2'>
            <Filter className='h-4 w-4' style={{ color: colors.textMuted }} />
            <span className='text-sm' style={{ color: colors.textTertiary }}>Filtri:</span>
          </div>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className='text-sm h-10 px-4 rounded-full border outline-none'
            style={{
              backgroundColor: colors.glowStrong,
              borderColor: colors.borderSubtle,
              color: colors.textPrimary,
            }}
          >
            <option value=''>Tutti i tipi</option>
            <option value='EMAIL'>Email</option>
            <option value='SMS'>SMS</option>
            <option value='WHATSAPP'>WhatsApp</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className='text-sm h-10 px-4 rounded-full border outline-none'
            style={{
              backgroundColor: colors.glowStrong,
              borderColor: colors.borderSubtle,
              color: colors.textPrimary,
            }}
          >
            <option value=''>Tutti gli stati</option>
            <option value='DRAFT'>Bozza</option>
            <option value='SCHEDULED'>Pianificata</option>
            <option value='IN_PROGRESS'>In Corso</option>
            <option value='COMPLETED'>Completata</option>
            <option value='CANCELLED'>Annullata</option>
          </select>
        </motion.div>

        {/* Campaigns List */}
        <motion.div
          variants={itemVariants}
          className='rounded-2xl border overflow-hidden'
          style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
        >
          <div className='px-5 py-4 flex items-center gap-2 border-b' style={{ borderColor: colors.borderSubtle }}>
            <Megaphone className='h-5 w-5' style={{ color: colors.purple }} />
            <h2 className='text-base font-medium' style={{ color: colors.textPrimary }}>Campagne</h2>
          </div>

          {error ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <AlertCircle className='h-12 w-12 mb-4' style={{ color: colors.borderSubtle }} />
              <p className='text-sm' style={{ color: colors.textTertiary }}>
                Impossibile caricare le campagne
              </p>
              <button
                className='mt-4 h-10 px-4 rounded-full text-sm border transition-colors hover:bg-white/5'
                style={{ borderColor: colors.border, color: colors.textSecondary }}
                onClick={() => mutate()}
              >
                Riprova
              </button>
            </div>
          ) : isLoading ? (
            <div className='flex items-center justify-center py-16'>
              <Loader2 className='h-8 w-8 animate-spin' style={{ color: colors.textMuted }} />
            </div>
          ) : campaigns.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <div
                className='w-16 h-16 rounded-2xl flex items-center justify-center mb-4'
                style={{ backgroundColor: `${colors.purple}15` }}
              >
                <Megaphone className='h-8 w-8' style={{ color: colors.borderSubtle }} />
              </div>
              <p className='text-base font-medium mb-1' style={{ color: colors.textPrimary }}>
                Nessuna campagna
              </p>
              <p className='text-[13px] max-w-sm mb-6' style={{ color: colors.textTertiary }}>
                Crea la tua prima campagna marketing per raggiungere i clienti.
              </p>
              <Link href='/dashboard/marketing/new'>
                <button
                  className='h-10 px-5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-90'
                  style={{ backgroundColor: colors.accent, color: colors.bg }}
                >
                  <Plus className='h-4 w-4' />
                  Crea Campagna
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div className='divide-y' style={{ borderColor: colors.borderSubtle }}>
                {campaigns.map(campaign => {
                  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
                  const typeCfg = TYPE_CONFIG[campaign.type] || TYPE_CONFIG.EMAIL;
                  const TypeIcon = typeCfg.icon;

                  return (
                    <div
                      key={campaign.id}
                      className='flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors group'
                      style={{ borderColor: colors.borderSubtle }}
                      onClick={() => window.location.href = `/dashboard/marketing/${campaign.id}`}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Status bar */}
                      <div
                        className='w-1 h-12 rounded-full flex-shrink-0'
                        style={{ backgroundColor: statusCfg.barColor }}
                      />
                      {/* Info */}
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium truncate' style={{ color: colors.textPrimary }}>
                          {campaign.name}
                        </p>
                        <div className='flex items-center gap-3 mt-1'>
                          <div className='flex items-center gap-1'>
                            <TypeIcon className='h-3.5 w-3.5' style={{ color: colors.textMuted }} />
                            <span className='text-[12px]' style={{ color: colors.textTertiary }}>{typeCfg.label}</span>
                          </div>
                          <span
                            className='text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full'
                            style={{ backgroundColor: `${statusCfg.color}18`, color: statusCfg.color }}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                      {/* Metrics */}
                      <div className='hidden sm:flex items-center gap-6 text-right'>
                        <div>
                          <p className='text-xs' style={{ color: colors.textMuted }}>Destinatari</p>
                          <p className='text-sm font-medium' style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                            {campaign.recipientCount}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs' style={{ color: colors.textMuted }}>Inviati</p>
                          <p className='text-sm font-medium' style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                            {campaign.sentCount}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs' style={{ color: colors.textMuted }}>Aperti</p>
                          <p className='text-sm font-medium' style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                            {campaign.openedCount}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs' style={{ color: colors.textMuted }}>Click</p>
                          <p className='text-sm font-medium' style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                            {campaign.clickedCount}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs' style={{ color: colors.textMuted }}>Data</p>
                          <p className='text-[13px]' style={{ color: colors.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                            {new Date(campaign.scheduledAt || campaign.createdAt).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className='h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0'
                        style={{ color: colors.textMuted }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className='px-5 py-4 border-t' style={{ borderColor: colors.borderSubtle }}>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </motion.div>

        {/* Segments Link */}
        <motion.div variants={itemVariants}>
          <Link href='/dashboard/marketing/segments'>
            <div
              className='rounded-2xl border p-5 flex items-center justify-between cursor-pointer transition-colors group'
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.surface)}
            >
              <div className='flex items-center gap-4'>
                <div
                  className='w-12 h-12 rounded-xl flex items-center justify-center'
                  style={{ backgroundColor: `${colors.info}15` }}
                >
                  <Users className='h-6 w-6' style={{ color: colors.info }} />
                </div>
                <div>
                  <h3 className='text-sm font-medium' style={{ color: colors.textPrimary }}>
                    Segmenti Clienti
                  </h3>
                  <p className='text-[13px] mt-0.5' style={{ color: colors.textTertiary }}>
                    Crea e gestisci segmenti per targettizzare le campagne
                  </p>
                </div>
              </div>
              <ChevronRight className='h-5 w-5' style={{ color: colors.textMuted }} />
            </div>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
