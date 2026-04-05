'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardHeader, AppleCardContent } from '@/components/ui/apple-card';
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
    <div className='bg-[var(--surface-tertiary)]'>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Diagnostica OBD</h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Monitoraggio dispositivi OBD-II e diagnostica veicoli
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton variant='ghost' size='sm' onClick={handleRefresh} icon={<RefreshCw className='h-4 w-4' />} />
            <Link href='/dashboard/obd/alerts'>
              <AppleButton variant='secondary' icon={<Bell className='h-4 w-4' />}>
                Regole Alert
              </AppleButton>
            </Link>
            <Link href='/dashboard/obd/pair'>
              <AppleButton variant='primary' icon={<Plus className='h-4 w-4' />}>
                Associa Dispositivo
              </AppleButton>
            </Link>
          </div>
        </div>
      </header>

      <motion.div className='p-4 sm:p-8 space-y-6' initial='hidden' animate='visible' variants={containerVariants}>
        {/* Error */}
        {hasError && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Errore nel caricamento dei dati OBD. Impossibile comunicare con il server.
                  </p>
                  <AppleButton variant='ghost' className='mt-4' onClick={handleRefresh}>
                    Riprova
                  </AppleButton>
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Loading */}
        {devicesLoading && !hasError && (
          <motion.div variants={listItemVariants}>
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
            </div>
          </motion.div>
        )}

        {/* Stats */}
        {!devicesLoading && !hasError && (
          <motion.div className='grid grid-cols-1 sm:grid-cols-3 gap-bento' variants={containerVariants}>
            {[
              { label: 'Dispositivi Totali', value: devices.length, icon: Gauge, color: 'bg-apple-blue' },
              { label: 'Connessi', value: connectedCount, icon: Wifi, color: 'bg-apple-green' },
              { label: 'Disconnessi', value: devices.length - connectedCount, icon: WifiOff, color: 'bg-apple-red' },
            ].map(stat => (
              <motion.div key={stat.label} variants={statsCardVariants}>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <div className='flex items-center justify-between mb-3'>
                      <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                        <stat.icon className='h-5 w-5 text-white' />
                      </div>
                    </div>
                    <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                      {stat.value}
                    </p>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{stat.label}</p>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Devices Grid */}
        {!devicesLoading && !hasError && (
          <motion.div variants={listItemVariants}>
            <AppleCard hover={false}>
              <AppleCardHeader>
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                  Dispositivi Collegati
                </h2>
              </AppleCardHeader>
              <AppleCardContent>
                {devices.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <WifiOff className='h-12 w-12 text-apple-gray/40 mb-4' />
                    <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                      Nessun dispositivo OBD. Associa il primo dispositivo per iniziare.
                    </p>
                    <Link href='/dashboard/obd/pair'>
                      <AppleButton variant='ghost' className='mt-4' icon={<Plus className='h-4 w-4' />}>
                        Associa Dispositivo
                      </AppleButton>
                    </Link>
                  </div>
                ) : (
                  <motion.div
                    className='space-y-3'
                    variants={containerVariants}
                    initial='hidden'
                    animate='visible'
                  >
                    {devices.map((device, index) => (
                      <Link key={device.id} href={`/dashboard/obd/${device.vehicleId}`}>
                        <motion.div
                          className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                          variants={listItemVariants}
                          custom={index}
                          whileHover={{ scale: 1.005, x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className='flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-xl bg-apple-purple/10 flex items-center justify-center'>
                              <Car className='h-6 w-6 text-apple-purple' />
                            </div>
                            <div>
                              <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                {device.vehicleName}
                              </p>
                              <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                                {device.vehiclePlate} &bull; ID: {device.deviceId}
                              </p>
                              {device.lastReadingAt && (
                                <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] opacity-70'>
                                  Ultima lettura: {new Date(device.lastReadingAt).toLocaleString('it-IT')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className='flex items-center gap-4'>
                            <span
                              className={`text-footnote font-semibold px-2.5 py-1 rounded-full ${
                                device.connected
                                  ? 'bg-green-100 dark:bg-green-900/40 text-apple-green dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/40 text-apple-red dark:text-red-300'
                              }`}
                            >
                              {device.connected ? 'Connesso' : 'Disconnesso'}
                            </span>
                            <ChevronRight className='h-4 w-4 text-apple-gray dark:text-[var(--text-secondary)]' />
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
