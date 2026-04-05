'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Mail,
  Users,
  Send,
  Eye,
  MousePointerClick,
  Copy,
  XCircle,
  Loader2,
  AlertCircle,
  BarChart3,
  FileText,
  UserCheck,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface CampaignDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  body: string | null;
  template: string | null;
  recipientCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  conversions: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  recipients: Array<{
    id: string;
    name: string;
    email: string;
    deliveryStatus: string;
    openedAt: string | null;
    clickedAt: string | null;
  }>;
  openRateOverTime: Array<{ date: string; rate: number }>;
  clickDistribution: Array<{ link: string; clicks: number }>;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Bozza', bg: 'bg-apple-light-gray dark:bg-[var(--surface-elevated)]', color: 'text-apple-dark dark:text-[var(--text-primary)]' },
  SCHEDULED: { label: 'Pianificata', bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-700 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Corso', bg: 'bg-orange-100 dark:bg-orange-900/40', color: 'text-orange-700 dark:text-orange-300' },
  COMPLETED: { label: 'Completata', bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-apple-green dark:text-green-300' },
  CANCELLED: { label: 'Annullata', bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-apple-red dark:text-red-300' },
  SENT: { label: 'Inviata', bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-apple-green dark:text-green-300' },
};

const DELIVERY_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'In attesa', color: 'text-apple-gray dark:text-[var(--text-secondary)]' },
  SENT: { label: 'Inviato', color: 'text-apple-blue' },
  DELIVERED: { label: 'Consegnato', color: 'text-apple-green' },
  OPENED: { label: 'Aperto', color: 'text-apple-orange' },
  CLICKED: { label: 'Cliccato', color: 'text-apple-purple' },
  BOUNCED: { label: 'Rimbalzato', color: 'text-apple-red' },
  FAILED: { label: 'Fallito', color: 'text-apple-red' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'recipients' | 'stats'>('overview');
  const [sending, setSending] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: rawData, error, isLoading, mutate } = useSWR<{ data?: CampaignDetail } | CampaignDetail>(
    `/api/dashboard/campaigns/${id}`,
    fetcher
  );

  const campaign: CampaignDetail | null = (() => {
    if (!rawData) return null;
    return (rawData as { data?: CampaignDetail }).data || (rawData as CampaignDetail);
  })();

  const openRate = campaign && campaign.sentCount > 0
    ? ((campaign.openedCount / campaign.sentCount) * 100).toFixed(1)
    : '0';
  const clickRate = campaign && campaign.sentCount > 0
    ? ((campaign.clickedCount / campaign.sentCount) * 100).toFixed(1)
    : '0';

  const handleSend = async () => {
    if (!campaign) return;
    setSending(true);
    try {
      const res = await fetch(`/api/dashboard/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      if (!res.ok) throw new Error('Errore nell\'invio');
      toast.success('Campagna inviata con successo');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'invio della campagna');
    } finally {
      setSending(false);
    }
  };

  const handleDuplicate = async () => {
    if (!campaign) return;
    setDuplicating(true);
    try {
      const res = await fetch('/api/dashboard/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${campaign.name} (copia)`,
          type: campaign.type,
          subject: campaign.subject,
          body: campaign.body,
        }),
      });
      if (!res.ok) throw new Error('Errore nella duplicazione');
      const json = await res.json();
      const newId = json.data?.id || json.id;
      toast.success('Campagna duplicata');
      if (newId) router.push(`/dashboard/marketing/${newId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella duplicazione');
    } finally {
      setDuplicating(false);
    }
  };

  const handleCancel = async () => {
    if (!campaign) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/dashboard/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) throw new Error('Errore nell\'annullamento');
      toast.success('Campagna annullata');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'annullamento');
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center'>
        <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
        <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
          Campagna non trovata
        </p>
        <Link href='/dashboard/marketing'>
          <AppleButton variant='secondary'>Torna alle campagne</AppleButton>
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
  const tabs = [
    { key: 'overview' as const, label: 'Panoramica' },
    { key: 'content' as const, label: 'Contenuto' },
    { key: 'recipients' as const, label: 'Destinatari' },
    { key: 'stats' as const, label: 'Statistiche' },
  ];

  return (
    <div>
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Marketing', href: '/dashboard/marketing' },
              { label: campaign.name },
            ]}
          />
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>{campaign.name}</h1>
              <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
                <AppleButton icon={<Send className='h-4 w-4' />} loading={sending} onClick={handleSend}>
                  Invia
                </AppleButton>
              )}
              <AppleButton variant='secondary' icon={<Copy className='h-4 w-4' />} loading={duplicating} onClick={handleDuplicate}>
                Duplica
              </AppleButton>
              {campaign.status === 'IN_PROGRESS' && (
                <AppleButton variant='ghost' icon={<XCircle className='h-4 w-4' />} loading={cancelling} onClick={handleCancel}>
                  Annulla
                </AppleButton>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className='flex gap-1 mt-4'>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-body font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-apple-blue text-white'
                    : 'text-apple-gray dark:text-[var(--text-secondary)] hover:bg-apple-light-gray/50 dark:hover:bg-[var(--surface-hover)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <motion.div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4' variants={containerVariants}>
              {[
                { label: 'Tipo', value: campaign.type, icon: Mail, color: 'bg-apple-blue' },
                { label: 'Destinatari', value: String(campaign.recipientCount), icon: Users, color: 'bg-apple-purple' },
                { label: 'Inviati', value: String(campaign.sentCount), icon: Send, color: 'bg-apple-green' },
                { label: 'Tasso Apertura', value: `${openRate}%`, icon: Eye, color: 'bg-apple-orange' },
                { label: 'Tasso Click', value: `${clickRate}%`, icon: MousePointerClick, color: 'bg-apple-red' },
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

            {/* Details */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <FileText className='h-5 w-5 text-apple-gray' /> Dettagli
                  </h2>
                </AppleCardHeader>
                <AppleCardContent className='space-y-3'>
                  {campaign.subject && (
                    <div className='flex justify-between text-body'>
                      <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Oggetto</span>
                      <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>{campaign.subject}</span>
                    </div>
                  )}
                  <div className='flex justify-between text-body'>
                    <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Data invio</span>
                    <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      {campaign.sentAt
                        ? new Date(campaign.sentAt).toLocaleString('it-IT')
                        : campaign.scheduledAt
                          ? `Pianificata: ${new Date(campaign.scheduledAt).toLocaleString('it-IT')}`
                          : 'Non pianificata'}
                    </span>
                  </div>
                  <div className='flex justify-between text-body'>
                    <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Data creazione</span>
                    <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      {new Date(campaign.createdAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <div className='flex justify-between text-body'>
                    <span className='text-apple-gray dark:text-[var(--text-secondary)]'>Conversioni</span>
                    <span className='font-medium text-apple-dark dark:text-[var(--text-primary)]'>{campaign.conversions || 0}</span>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </>
        )}

        {activeTab === 'content' && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Contenuto della Campagna
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {campaign.subject && (
                  <div className='mb-4'>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-1'>Oggetto</p>
                    <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>{campaign.subject}</p>
                  </div>
                )}
                <div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-2'>Corpo del messaggio</p>
                  <div className='p-6 bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] rounded-xl text-body text-apple-dark dark:text-[var(--text-primary)] whitespace-pre-wrap'>
                    {campaign.body || campaign.template || 'Nessun contenuto disponibile'}
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {activeTab === 'recipients' && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center gap-2'>
                  <Users className='h-5 w-5 text-apple-blue' />
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                    Destinatari ({campaign.recipients?.length || campaign.recipientCount})
                  </h2>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                {!campaign.recipients || campaign.recipients.length === 0 ? (
                  <div className='text-center py-12'>
                    <UserCheck className='h-8 w-8 text-apple-gray/40 mx-auto mb-3' />
                    <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                      Nessun destinatario disponibile
                    </p>
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full text-body'>
                      <thead>
                        <tr className='border-b border-apple-border/30 dark:border-[var(--border-default)]'>
                          <th className='text-left py-2 px-2 text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Nome</th>
                          <th className='text-left py-2 px-2 text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Email</th>
                          <th className='text-left py-2 px-2 text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Stato</th>
                          <th className='text-left py-2 px-2 text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Aperto</th>
                          <th className='text-left py-2 px-2 text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)]'>Cliccato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaign.recipients.map(r => {
                          const ds = DELIVERY_STATUS[r.deliveryStatus] || DELIVERY_STATUS.PENDING;
                          return (
                            <tr key={r.id} className='border-b border-apple-border/10 dark:border-[var(--border-default)]/30'>
                              <td className='py-2 px-2 text-apple-dark dark:text-[var(--text-primary)]'>{r.name}</td>
                              <td className='py-2 px-2 text-apple-gray'>{r.email}</td>
                              <td className='py-2 px-2'>
                                <span className={`text-footnote font-medium ${ds.color}`}>{ds.label}</span>
                              </td>
                              <td className='py-2 px-2 text-apple-gray'>
                                {r.openedAt ? new Date(r.openedAt).toLocaleString('it-IT') : '-'}
                              </td>
                              <td className='py-2 px-2 text-apple-gray'>
                                {r.clickedAt ? new Date(r.clickedAt).toLocaleString('it-IT') : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <>
            {/* Open Rate Over Time */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <BarChart3 className='h-5 w-5 text-apple-blue' /> Tasso Apertura nel Tempo
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {campaign.openRateOverTime && campaign.openRateOverTime.length > 0 ? (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={campaign.openRateOverTime}>
                          <CartesianGrid strokeDasharray='3 3' stroke='#e5e5e5' />
                          <XAxis dataKey='date' tick={{ fontSize: 12 }} stroke='#8e8e93' />
                          <YAxis tick={{ fontSize: 12 }} stroke='#8e8e93' unit='%' />
                          <Tooltip formatter={(value: number) => [`${value}%`, 'Tasso apertura']} />
                          <Line type='monotone' dataKey='rate' stroke='#0071e3' strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className='text-center py-12'>
                      <Clock className='h-8 w-8 text-apple-gray/40 mx-auto mb-3' />
                      <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                        Dati statistici non ancora disponibili
                      </p>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            {/* Click Distribution */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] flex items-center gap-2'>
                    <MousePointerClick className='h-5 w-5 text-apple-purple' /> Distribuzione Click
                  </h2>
                </AppleCardHeader>
                <AppleCardContent>
                  {campaign.clickDistribution && campaign.clickDistribution.length > 0 ? (
                    <div className='h-72'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={campaign.clickDistribution} layout='vertical'>
                          <CartesianGrid strokeDasharray='3 3' stroke='#e5e5e5' />
                          <XAxis type='number' tick={{ fontSize: 12 }} stroke='#8e8e93' />
                          <YAxis dataKey='link' type='category' tick={{ fontSize: 11 }} stroke='#8e8e93' width={200} />
                          <Tooltip />
                          <Bar dataKey='clicks' fill='#af52de' radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className='text-center py-12'>
                      <MousePointerClick className='h-8 w-8 text-apple-gray/40 mx-auto mb-3' />
                      <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                        Nessun click registrato
                      </p>
                    </div>
                  )}
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
