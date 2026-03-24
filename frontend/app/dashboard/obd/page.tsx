'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Plus,
  Car,
  Loader2,
  AlertCircle,
  Bell,
  Gauge,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

interface OBDDevice {
  id: string;
  deviceId: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  connected: boolean;
  lastReadingAt: string | null;
}

interface DTCAlert {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
}

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function OBDPage() {
  const {
    data: devicesData,
    error: devicesError,
    isLoading: devicesLoading,
    mutate: mutateDevices,
  } = useSWR<{ data?: OBDDevice[] } | OBDDevice[]>('/api/dashboard/obd/devices', fetcher);

  const devices: OBDDevice[] = (() => {
    if (!devicesData) return [];
    const list = (devicesData as { data?: OBDDevice[] }).data || devicesData;
    return Array.isArray(list) ? list : [];
  })();

  const connectedCount = devices.filter(d => d.connected).length;
  const hasError = !!devicesError;

  const handleRefresh = useCallback((): void => {
    void mutateDevices();
  }, [mutateDevices]);

  return (
    <div className='min-h-screen' style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className='sticky top-0 z-30 backdrop-blur-xl border-b'
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
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
                Diagnostica OBD
              </h1>
              <p className='text-[13px]' style={{ color: colors.textTertiary }}>
                Monitoraggio dispositivi OBD-II e diagnostica veicoli
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={handleRefresh}
              className='w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5'
              style={{ color: colors.textSecondary }}
            >
              <RefreshCw className='h-4 w-4' />
            </button>
            <Link href='/dashboard/obd/alerts'>
              <button
                className='h-10 px-4 rounded-full border flex items-center gap-2 text-sm transition-colors hover:bg-white/5'
                style={{ borderColor: colors.border, color: colors.textPrimary }}
              >
                <Bell className='h-4 w-4' />
                Regole Alert
              </button>
            </Link>
            <Link href='/dashboard/obd/pair'>
              <button
                className='h-10 px-4 rounded-full flex items-center gap-2 text-sm font-medium transition-colors'
                style={{ backgroundColor: colors.accent, color: colors.bg }}
              >
                <Plus className='h-4 w-4' />
                Associa Dispositivo
              </button>
            </Link>
          </div>
        </div>
      </header>

      <motion.div className='p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Error */}
        {hasError && (
          <motion.div variants={itemVariants}>
            <div
              className='rounded-2xl border p-6 flex items-center gap-4'
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.error,
                borderLeftWidth: 4,
              }}
            >
              <div
                className='w-12 h-12 rounded-2xl flex items-center justify-center'
                style={{ backgroundColor: `${colors.error}15` }}
              >
                <AlertTriangle className='h-6 w-6' style={{ color: colors.error }} />
              </div>
              <div className='flex-1'>
                <h3 className='text-[15px] font-semibold' style={{ color: colors.textPrimary }}>
                  Errore nel caricamento dei dati OBD
                </h3>
                <p className='text-[13px] mt-1' style={{ color: colors.textTertiary }}>
                  Impossibile comunicare con il server. Verifica la connessione e riprova.
                </p>
              </div>
              <button
                onClick={handleRefresh}
                className='h-10 px-4 rounded-full border flex items-center gap-2 text-sm transition-colors hover:bg-white/5'
                style={{ borderColor: colors.border, color: colors.textPrimary }}
              >
                <RefreshCw className='h-4 w-4' /> Riprova
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {devicesLoading && !hasError && (
          <motion.div variants={itemVariants}>
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin' style={{ color: colors.textTertiary }} />
            </div>
          </motion.div>
        )}

        {/* Stats */}
        {!devicesLoading && !hasError && (
          <motion.div className='grid grid-cols-1 sm:grid-cols-3 gap-4' variants={containerVariants}>
            {[
              { label: 'Dispositivi Totali', value: devices.length, icon: Gauge, color: colors.info },
              { label: 'Connessi', value: connectedCount, icon: Wifi, color: colors.success },
              { label: 'Disconnessi', value: devices.length - connectedCount, icon: WifiOff, color: colors.error },
            ].map(stat => (
              <motion.div key={stat.label} variants={itemVariants}>
                <div
                  className='rounded-2xl border h-[120px] flex flex-col justify-center px-6'
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  }}
                >
                  <div className='flex items-center gap-3 mb-2'>
                    <stat.icon className='h-5 w-5' style={{ color: stat.color }} />
                    <span className='text-[13px]' style={{ color: colors.textTertiary }}>
                      {stat.label}
                    </span>
                  </div>
                  <p
                    className='text-[32px] font-light'
                    style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Devices Grid */}
        {!devicesLoading && !hasError && (
          <motion.div variants={itemVariants}>
            <div
              className='rounded-2xl border'
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <div className='px-6 py-4 border-b flex items-center gap-2' style={{ borderColor: colors.borderSubtle }}>
                <Activity className='h-5 w-5' style={{ color: colors.info }} />
                <h2 className='text-[17px] font-medium' style={{ color: colors.textPrimary }}>
                  Dispositivi Collegati
                </h2>
              </div>
              <div className='p-6'>
                {devices.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <div
                      className='w-16 h-16 rounded-2xl flex items-center justify-center mb-4'
                      style={{ backgroundColor: colors.glowStrong }}
                    >
                      <WifiOff className='h-8 w-8' style={{ color: colors.textTertiary }} />
                    </div>
                    <h3 className='text-[17px] font-medium mb-2' style={{ color: colors.textPrimary }}>
                      Nessun dispositivo OBD
                    </h3>
                    <p className='text-[13px] max-w-md mb-6' style={{ color: colors.textTertiary }}>
                      Associa il primo dispositivo OBD-II per iniziare il monitoraggio dei veicoli.
                    </p>
                    <Link href='/dashboard/obd/pair'>
                      <button
                        className='h-10 px-4 rounded-full flex items-center gap-2 text-sm font-medium'
                        style={{ backgroundColor: colors.accent, color: colors.bg }}
                      >
                        <Plus className='h-4 w-4' />
                        Associa Dispositivo
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {devices.map(device => (
                      <Link key={device.id} href={`/dashboard/obd/${device.vehicleId}`}>
                        <div
                          className='p-4 rounded-2xl transition-all cursor-pointer group'
                          style={{ backgroundColor: colors.glowStrong }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.surfaceHover;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.glowStrong;
                          }}
                        >
                          <div className='flex items-center justify-between mb-3'>
                            <div
                              className='w-10 h-10 rounded-xl flex items-center justify-center'
                              style={{ backgroundColor: `${colors.purple}15` }}
                            >
                              <Car className='h-5 w-5' style={{ color: colors.purple }} />
                            </div>
                            <div
                              className='flex items-center gap-1.5 px-2 py-1 rounded-full'
                              style={{
                                backgroundColor: device.connected ? `${colors.success}15` : `${colors.error}15`,
                                color: device.connected ? colors.success : colors.error,
                              }}
                            >
                              {device.connected ? <Wifi className='h-3 w-3' /> : <WifiOff className='h-3 w-3' />}
                              <span className='text-[10px] font-semibold'>
                                {device.connected ? 'Connesso' : 'Disconnesso'}
                              </span>
                            </div>
                          </div>
                          <p className='text-[15px] font-medium' style={{ color: colors.textPrimary }}>
                            {device.vehicleName}
                          </p>
                          <p className='text-[12px]' style={{ color: colors.textTertiary }}>
                            {device.vehiclePlate} - ID: {device.deviceId}
                          </p>
                          {device.lastReadingAt && (
                            <p className='text-[10px] mt-1' style={{ color: colors.textMuted }}>
                              Ultima lettura: {new Date(device.lastReadingAt).toLocaleString('it-IT')}
                            </p>
                          )}
                          <div className='flex justify-end mt-2'>
                            <ChevronRight
                              className='h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity'
                              style={{ color: colors.textTertiary }}
                            />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
