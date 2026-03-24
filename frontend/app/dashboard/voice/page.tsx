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
  AlertTriangle,
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

export default function VoicePage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useSWR<VoiceStats>(
    '/api/dashboard/voice/stats',
    statsFetcher,
    { onError: () => toast.error('Errore caricamento statistiche voce') }
  );

  const { data: calls, isLoading: callsLoading } = useSWR<VoiceCall[]>(
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

  // Loading
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  // Error
  if (statsError) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-red-400 mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-apple-gray dark:text-[#636366]'>
              Impossibile caricare i dati dell&apos;assistente vocale.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Assistente Vocale AI</h1>
              <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
                Gestisci le chiamate automatiche della tua officina
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-body text-apple-gray dark:text-[#636366]'>
                {enabled ? 'Attivo' : 'Disattivato'}
              </span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-6xl mx-auto space-y-6'>
        {/* Stats */}
        {stats && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center'>
                      <PhoneCall className='w-5 h-5 text-blue-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Chiamate oggi</p>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                        {stats.callsToday}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center'>
                      <Clock className='w-5 h-5 text-purple-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Durata media</p>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                        {formatDuration(stats.avgDuration)}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center'>
                      <BarChart3 className='w-5 h-5 text-green-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Tasso risoluzione</p>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                        {stats.resolutionRate.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center'>
                      <Mic className='w-5 h-5 text-orange-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Totale chiamate</p>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                        {stats.totalCalls}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        )}

        {/* Recent Calls */}
        <AppleCard>
          <AppleCardHeader>
            <div className='flex items-center gap-3'>
              <Phone className='h-5 w-5 text-apple-blue' />
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                Chiamate Recenti
              </h2>
            </div>
          </AppleCardHeader>
          <AppleCardContent>
            {calls && calls.length > 0 ? (
              <div className='space-y-3'>
                {calls.map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-apple-light-gray/30 dark:bg-[#353535] hover:bg-apple-light-gray/50 dark:hover:bg-[#3a3a3a] transition-colors'
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 bg-apple-blue/10 rounded-xl flex items-center justify-center flex-shrink-0'>
                        <PhoneCall className='w-5 h-5 text-apple-blue' />
                      </div>
                      <div>
                        <p className='text-body font-medium text-apple-dark dark:text-[#ececec]'>
                          {call.callerNumber}
                        </p>
                        <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                          {new Date(call.timestamp).toLocaleString('it-IT')} - {formatDuration(call.duration)}
                        </p>
                        {call.transcriptSummary && (
                          <p className='text-footnote text-apple-gray dark:text-[#636366] mt-1 line-clamp-1'>
                            {call.transcriptSummary}
                          </p>
                        )}
                      </div>
                    </div>
                    {getOutcomeBadge(call.outcome)}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <Phone className='w-12 h-12 text-apple-gray/30 mx-auto mb-4' />
                <h3 className='text-body font-medium text-apple-dark dark:text-[#ececec] mb-1'>
                  Nessuna chiamata recente
                </h3>
                <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                  Le chiamate gestite dall&apos;assistente vocale appariranno qui.
                </p>
              </div>
            )}
          </AppleCardContent>
        </AppleCard>

        {/* Settings */}
        <AppleCard>
          <AppleCardHeader>
            <div className='flex items-center gap-3'>
              <Settings className='h-5 w-5 text-apple-blue' />
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                Configurazione
              </h2>
            </div>
          </AppleCardHeader>
          <AppleCardContent>
            <div className='space-y-4'>
              <div className='flex items-center justify-between p-4 bg-apple-light-gray/30 dark:bg-[#353535] rounded-xl'>
                <div className='flex items-center gap-3'>
                  <Power className='w-5 h-5 text-apple-gray' />
                  <div>
                    <p className='text-body font-medium text-apple-dark dark:text-[#ececec]'>
                      Assistente vocale
                    </p>
                    <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                      Attiva o disattiva l&apos;assistente per le chiamate in entrata
                    </p>
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className='flex items-center justify-between p-4 bg-apple-light-gray/30 dark:bg-[#353535] rounded-xl'>
                <div className='flex items-center gap-3'>
                  <Mic className='w-5 h-5 text-apple-gray' />
                  <div>
                    <p className='text-body font-medium text-apple-dark dark:text-[#ececec]'>
                      Messaggio di benvenuto
                    </p>
                    <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                      Personalizza il messaggio iniziale dell&apos;assistente
                    </p>
                  </div>
                </div>
                <AppleButton variant='secondary' size='sm'>
                  Modifica
                </AppleButton>
              </div>

              <div className='flex items-center justify-between p-4 bg-apple-light-gray/30 dark:bg-[#353535] rounded-xl'>
                <div className='flex items-center gap-3'>
                  <Clock className='w-5 h-5 text-apple-gray' />
                  <div>
                    <p className='text-body font-medium text-apple-dark dark:text-[#ececec]'>
                      Orari di attivit&agrave;
                    </p>
                    <p className='text-footnote text-apple-gray dark:text-[#636366]'>
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
      </div>
    </div>
  );
}
