'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  BarChart3,
  Settings,
  Power,
  Mic,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface VoiceStats {
  callsToday: number;
  avgDuration: number;
  resolutionRate: number;
  totalCalls: number;
}

interface VoiceCall {
  id: string;
  timestamp: string;
  callerNumber: string;
  duration: number;
  outcome: string;
  transcriptSummary: string;
}

interface StatsResponse {
  data?: VoiceStats;
  callsToday?: number;
}

interface CallsResponse {
  data?: VoiceCall[];
  calls?: VoiceCall[];
}

const statsFetcher = (url: string): Promise<VoiceStats> =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Errore caricamento');
    const json: StatsResponse = await res.json();
    return (json.data || json) as VoiceStats;
  });

const callsFetcher = (url: string): Promise<VoiceCall[]> =>
  fetch(url).then(async (res) => {
    if (!res.ok) return [];
    const json: CallsResponse = await res.json();
    const list = json.data || json.calls;
    return Array.isArray(list) ? list : [];
  });

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

export default function VoicePage() {
  const { data: stats, isLoading: statsLoading, error: statsError, mutate: mutateStats } = useSWR<VoiceStats>(
    '/api/dashboard/voice/stats',
    statsFetcher,
    { onError: () => toast.error('Errore caricamento statistiche voce') }
  );

  const { data: calls, isLoading: callsLoading, mutate: mutateCalls } = useSWR<VoiceCall[]>(
    '/api/dashboard/voice/calls',
    callsFetcher,
    { onError: () => toast.error('Errore caricamento chiamate') }
  );

  const [enabled, setEnabled] = useState(true);

  const isLoading = statsLoading || callsLoading;

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getOutcomeBadge = (outcome: string) => {
    const configs: Record<string, { bg: string; text: string; label: string; icon: typeof CheckCircle }> = {
      BOOKING_CREATED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Prenotazione creata', icon: CheckCircle },
      INFO_PROVIDED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'Info fornite', icon: Phone },
      TRANSFERRED: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'Trasferito a operatore', icon: ArrowRight },
      MISSED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Persa', icon: PhoneOff },
    };
    const c = configs[outcome] || configs.INFO_PROVIDED;
    const Icon = c.icon;
    return (
      <Badge className={`${c.bg} ${c.text} border-0 gap-1`}>
        <Icon className='w-3 h-3' />
        {c.label}
      </Badge>
    );
  };

  const statCards = [
    {
      label: 'Chiamate oggi',
      value: String(stats?.callsToday ?? 0),
      icon: PhoneCall,
      color: 'bg-apple-blue',
    },
    {
      label: 'Durata media',
      value: stats ? formatDuration(stats.avgDuration) : '0:00',
      icon: Clock,
      color: 'bg-apple-purple',
    },
    {
      label: 'Tasso risoluzione',
      value: stats ? `${stats.resolutionRate.toFixed(0)}%` : '0%',
      icon: BarChart3,
      color: 'bg-apple-green',
    },
    {
      label: 'Totale chiamate',
      value: String(stats?.totalCalls ?? 0),
      icon: Mic,
      color: 'bg-apple-orange',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-4 sm:px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Assistente Vocale AI</h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestisci le chiamate automatiche della tua officina
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
              {enabled ? 'Attivo' : 'Disattivato'}
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </header>

      <motion.div
        className='p-4 sm:p-8 max-w-6xl mx-auto space-y-6'
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
                      <stat.icon className='h-5 w-5 text-white' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Calls */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Chiamate Recenti
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {statsError ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Impossibile caricare i dati dell&apos;assistente vocale
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => {
                      mutateStats();
                      mutateCalls();
                    }}
                  >
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                </div>
              ) : calls && calls.length > 0 ? (
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {calls.map((call, index) => (
                    <motion.div
                      key={call.id}
                      className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                      variants={listItemVariants}
                      custom={index}
                      whileHover={{ scale: 1.005, x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className='flex items-center gap-4'>
                        <div className='w-12 h-12 rounded-xl bg-apple-blue/10 flex items-center justify-center flex-shrink-0'>
                          <PhoneCall className='h-6 w-6 text-apple-blue' />
                        </div>
                        <div>
                          <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                            {call.callerNumber}
                          </p>
                          <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                            {new Date(call.timestamp).toLocaleString('it-IT')} - {formatDuration(call.duration)}
                          </p>
                          {call.transcriptSummary && (
                            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1 line-clamp-1'>
                              {call.transcriptSummary}
                            </p>
                          )}
                        </div>
                      </div>
                      {getOutcomeBadge(call.outcome)}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-gray/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Nessuna chiamata recente
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                    Le chiamate gestite dall&apos;assistente vocale appariranno qui.
                  </p>
                </div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Settings */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Configurazione
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              <div className='space-y-3'>
                <div className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]'>
                  <div className='flex items-center gap-3'>
                    <Power className='w-5 h-5 text-apple-gray' />
                    <div>
                      <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        Assistente vocale
                      </p>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        Attiva o disattiva l&apos;assistente per le chiamate in entrata
                      </p>
                    </div>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <div className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]'>
                  <div className='flex items-center gap-3'>
                    <Mic className='w-5 h-5 text-apple-gray' />
                    <div>
                      <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        Messaggio di benvenuto
                      </p>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        Personalizza il messaggio iniziale dell&apos;assistente
                      </p>
                    </div>
                  </div>
                  <AppleButton variant='secondary' size='sm'>
                    Modifica
                  </AppleButton>
                </div>

                <div className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]'>
                  <div className='flex items-center gap-3'>
                    <Clock className='w-5 h-5 text-apple-gray' />
                    <div>
                      <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                        Orari di attivit&agrave;
                      </p>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        Configura quando l&apos;assistente &egrave; attivo
                      </p>
                    </div>
                  </div>
                  <AppleButton variant='secondary' size='sm'>
                    Configura
                  </AppleButton>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
