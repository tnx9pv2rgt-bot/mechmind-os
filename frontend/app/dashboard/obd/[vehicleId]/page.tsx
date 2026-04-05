'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Activity,
  Gauge,
  Thermometer,
  Zap,
  AlertTriangle,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileDown,
  Trash2,
  Clock,
  Car,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LiveData {
  rpm: number | null;
  speed: number | null;
  coolantTemp: number | null;
  engineLoad: number | null;
  batteryVoltage: number | null;
  vehicleName: string;
  vehiclePlate: string;
  connected: boolean;
}

interface DTCCode {
  id: string;
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  resolved: boolean;
}

interface HistoryPoint {
  timestamp: string;
  rpm: number | null;
  speed: number | null;
  coolantTemp: number | null;
  batteryVoltage: number | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  low: { label: 'Basso', bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-green-700 dark:text-green-300' },
  medium: { label: 'Medio', bg: 'bg-yellow-100 dark:bg-yellow-900/40', color: 'text-yellow-700 dark:text-yellow-300' },
  high: { label: 'Alto', bg: 'bg-orange-100 dark:bg-orange-900/40', color: 'text-orange-700 dark:text-orange-300' },
  critical: { label: 'Critico', bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-700 dark:text-red-300' },
};

export default function OBDVehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.vehicleId as string;
  const [activeTab, setActiveTab] = useState<'live' | 'dtc' | 'history'>('live');
  const [dateRange, setDateRange] = useState('7d');
  const [clearing, setClearing] = useState(false);

  const { data: liveRaw, error: liveError, isLoading: liveLoading } = useSWR<{ data?: LiveData } | LiveData>(
    `/api/dashboard/obd/${vehicleId}/live`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: dtcRaw, error: dtcError, isLoading: dtcLoading, mutate: mutateDtc } = useSWR<{ data?: DTCCode[] } | DTCCode[]>(
    `/api/dashboard/obd/${vehicleId}/dtc-codes`,
    fetcher
  );

  const { data: historyRaw, error: historyError, isLoading: historyLoading } = useSWR<{ data?: HistoryPoint[] } | HistoryPoint[]>(
    `/api/dashboard/obd/${vehicleId}/history?range=${dateRange}`,
    fetcher
  );

  const liveData: LiveData | null = (() => {
    if (!liveRaw) return null;
    return (liveRaw as { data?: LiveData }).data || (liveRaw as LiveData);
  })();

  const dtcCodes: DTCCode[] = (() => {
    if (!dtcRaw) return [];
    const list = (dtcRaw as { data?: DTCCode[] }).data || dtcRaw;
    return Array.isArray(list) ? list : [];
  })();

  const history: HistoryPoint[] = (() => {
    if (!historyRaw) return [];
    const list = (historyRaw as { data?: HistoryPoint[] }).data || historyRaw;
    return Array.isArray(list) ? list : [];
  })();

  const activeDTCs = dtcCodes.filter(c => !c.resolved);
  const vehicleName = liveData?.vehicleName || 'Veicolo';
  const vehiclePlate = liveData?.vehiclePlate || '';
  const isLoading = liveLoading && dtcLoading;
  const hasError = liveError && dtcError;

  const handleClearDTCs = async () => {
    setClearing(true);
    try {
      const res = await fetch(`/api/dashboard/obd/${vehicleId}/dtc-codes`, {
        method: 'DELETE',
      } as RequestInit);
      if (!res.ok) throw new Error('Errore nella cancellazione');
      toast.success('Codici errore cancellati');
      mutateDtc();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella cancellazione dei codici');
    } finally {
      setClearing(false);
    }
  };

  const tabs = [
    { key: 'live' as const, label: 'Live' },
    { key: 'dtc' as const, label: `Codici Errore (${activeDTCs.length})` },
    { key: 'history' as const, label: 'Storico' },
  ];

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <AlertCircle className='h-12 w-12 text-apple-red/60 mb-4' />
        <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mb-4'>Dati OBD non disponibili</p>
        <Link href='/dashboard/obd'>
          <AppleButton variant='secondary'>Torna a OBD</AppleButton>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Diagnostica OBD', href: '/dashboard/obd' },
              { label: vehiclePlate ? `${vehicleName} (${vehiclePlate})` : vehicleName },
            ]}
          />
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-apple-purple/10 flex items-center justify-center'>
                <Car className='h-5 w-5 text-apple-purple' />
              </div>
              <div>
                <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>{vehicleName}</h1>
                <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body'>
                  {vehiclePlate && `Targa: ${vehiclePlate} - `}Diagnostica OBD-II
                  {liveData?.connected && (
                    <span className='ml-2 text-footnote px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-apple-green dark:text-green-300'>
                      Connesso
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <AppleButton variant='ghost' size='sm' icon={<FileDown className='h-4 w-4' />}>
                Esporta Dati
              </AppleButton>
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

      <motion.div className='p-8 space-y-6 max-w-6xl mx-auto' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Live Tab */}
        {activeTab === 'live' && (
          <>
            <motion.div className='grid grid-cols-2 md:grid-cols-5 gap-4' variants={containerVariants}>
              {[
                { label: 'RPM Motore', value: liveData?.rpm, unit: 'rpm', icon: Gauge, color: 'from-apple-blue to-blue-600' },
                { label: 'Velocità', value: liveData?.speed, unit: 'km/h', icon: Activity, color: 'from-apple-green to-emerald-600' },
                { label: 'Temp. Motore', value: liveData?.coolantTemp, unit: '\u00B0C', icon: Thermometer, color: 'from-apple-orange to-amber-600' },
                { label: 'Carico Motore', value: liveData?.engineLoad, unit: '%', icon: Activity, color: 'from-apple-purple to-violet-600' },
                { label: 'Tensione Batteria', value: liveData?.batteryVoltage, unit: 'V', icon: Zap, color: 'from-yellow-500 to-amber-600' },
              ].map(item => (
                <motion.div key={item.label} variants={cardVariants}>
                  <AppleCard>
                    <AppleCardContent>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                        <item.icon className='h-5 w-5 text-white' />
                      </div>
                      <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{item.label}</p>
                      <div className='flex items-baseline gap-1'>
                        <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                          {item.value != null ? String(item.value) : '--'}
                        </p>
                        <span className='text-caption text-apple-gray dark:text-[var(--text-secondary)]'>{item.unit}</span>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              ))}
            </motion.div>

            {!liveData?.connected && (
              <motion.div variants={cardVariants}>
                <AppleCard className='bg-apple-orange/5 border-apple-orange/20'>
                  <AppleCardContent className='text-center py-8'>
                    <AlertTriangle className='h-8 w-8 text-apple-orange mx-auto mb-3' />
                    <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                      Dispositivo non connesso
                    </p>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
                      I dati live non sono disponibili. Verifica la connessione del dispositivo OBD.
                    </p>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}
          </>
        )}

        {/* DTC Tab */}
        {activeTab === 'dtc' && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <AlertTriangle className='h-5 w-5 text-apple-red' />
                    <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                      Codici di Errore ({activeDTCs.length} attivi)
                    </h2>
                  </div>
                  {activeDTCs.length > 0 && (
                    <AppleButton
                      variant='ghost'
                      size='sm'
                      icon={<Trash2 className='h-4 w-4' />}
                      loading={clearing}
                      onClick={handleClearDTCs}
                    >
                      Cancella Codici
                    </AppleButton>
                  )}
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                {dtcLoading ? (
                  <div className='flex items-center justify-center py-12'>
                    <Loader2 className='h-6 w-6 animate-spin text-apple-blue' />
                  </div>
                ) : dtcCodes.length === 0 ? (
                  <div className='text-center py-12'>
                    <CheckCircle className='h-8 w-8 text-apple-green mx-auto mb-3' />
                    <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                      Nessun codice di errore. Il veicolo è in buone condizioni.
                    </p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {dtcCodes.map(tc => {
                      const sev = SEVERITY_CONFIG[tc.severity] || SEVERITY_CONFIG.low;
                      return (
                        <div
                          key={tc.id}
                          className={`flex items-center justify-between p-4 rounded-xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)]/50 ${tc.resolved ? 'opacity-50' : ''}`}
                        >
                          <div className='flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center'>
                              <span className='text-body font-bold text-apple-red dark:text-red-400'>{tc.code}</span>
                            </div>
                            <div>
                              <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>{tc.description}</p>
                              <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                Rilevato: {new Date(tc.detectedAt).toLocaleDateString('it-IT')}
                                {tc.resolved && <span className='ml-2 text-apple-green'>Risolto</span>}
                              </p>
                            </div>
                          </div>
                          <span className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${sev.bg} ${sev.color}`}>
                            {sev.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Clock className='h-5 w-5 text-apple-blue' />
                    <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                      Storico Letture
                    </h2>
                  </div>
                  <div className='flex gap-1'>
                    {[
                      { value: '1d', label: '1G' },
                      { value: '7d', label: '7G' },
                      { value: '30d', label: '30G' },
                      { value: '90d', label: '90G' },
                    ].map(r => (
                      <button
                        key={r.value}
                        onClick={() => setDateRange(r.value)}
                        className={`px-3 py-1 rounded-lg text-footnote font-medium transition-colors ${
                          dateRange === r.value
                            ? 'bg-apple-blue text-white'
                            : 'text-apple-gray hover:bg-apple-light-gray/50 dark:hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </AppleCardHeader>
              <AppleCardContent>
                {historyLoading ? (
                  <div className='flex items-center justify-center py-12'>
                    <Loader2 className='h-6 w-6 animate-spin text-apple-blue' />
                  </div>
                ) : history.length === 0 ? (
                  <div className='text-center py-12'>
                    <Clock className='h-8 w-8 text-apple-gray/40 mx-auto mb-3' />
                    <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                      Nessuno storico disponibile per il periodo selezionato.
                    </p>
                  </div>
                ) : (
                  <div className='space-y-6'>
                    {/* RPM Chart */}
                    <div>
                      <h3 className='text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-2'>RPM Motore</h3>
                      <div className='h-48'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={history}>
                            <CartesianGrid strokeDasharray='3 3' stroke='#e5e5e5' />
                            <XAxis
                              dataKey='timestamp'
                              tick={{ fontSize: 10 }}
                              stroke='#8e8e93'
                              tickFormatter={(v: string) => new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            />
                            <YAxis tick={{ fontSize: 10 }} stroke='#8e8e93' />
                            <Tooltip
                              labelFormatter={(v: string) => new Date(v).toLocaleString('it-IT')}
                              formatter={(value: number) => [value, 'RPM']}
                            />
                            <Line type='monotone' dataKey='rpm' stroke='#0071e3' strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Temperature Chart */}
                    <div>
                      <h3 className='text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-2'>Temperatura Motore</h3>
                      <div className='h-48'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={history}>
                            <CartesianGrid strokeDasharray='3 3' stroke='#e5e5e5' />
                            <XAxis
                              dataKey='timestamp'
                              tick={{ fontSize: 10 }}
                              stroke='#8e8e93'
                              tickFormatter={(v: string) => new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            />
                            <YAxis tick={{ fontSize: 10 }} stroke='#8e8e93' unit={'\u00B0C'} />
                            <Tooltip
                              labelFormatter={(v: string) => new Date(v).toLocaleString('it-IT')}
                              formatter={(value: number) => [`${value}\u00B0C`, 'Temperatura']}
                            />
                            <Line type='monotone' dataKey='coolantTemp' stroke='#ff9500' strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Battery Chart */}
                    <div>
                      <h3 className='text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] mb-2'>Tensione Batteria</h3>
                      <div className='h-48'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart data={history}>
                            <CartesianGrid strokeDasharray='3 3' stroke='#e5e5e5' />
                            <XAxis
                              dataKey='timestamp'
                              tick={{ fontSize: 10 }}
                              stroke='#8e8e93'
                              tickFormatter={(v: string) => new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            />
                            <YAxis tick={{ fontSize: 10 }} stroke='#8e8e93' unit='V' />
                            <Tooltip
                              labelFormatter={(v: string) => new Date(v).toLocaleString('it-IT')}
                              formatter={(value: number) => [`${value}V`, 'Tensione']}
                            />
                            <Line type='monotone' dataKey='batteryVoltage' stroke='#30d158' strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
