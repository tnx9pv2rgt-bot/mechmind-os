'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Wrench, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { PortalPageWrapper } from '@/components/portal';
import { MaintenanceList } from '@/components/portal';
import { MaintenanceSchedule, Customer } from '@/lib/types/portal';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalMaintenancePage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'overdue'>('all');
  const [customer] = useState<Customer | null>(null);

  const {
    data: rawData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<{ data: MaintenanceSchedule[] }>('/api/portal/maintenance', fetcher);

  const maintenance = rawData?.data || [];
  const error = swrError
    ? swrError instanceof Error
      ? swrError.message
      : 'Errore nel caricamento della manutenzione'
    : null;

  const filteredMaintenance = useMemo(() => {
    if (filter === 'all') return maintenance;
    return maintenance.filter(m => m.status === filter);
  }, [filter, maintenance]);

  const stats = {
    upcoming: maintenance.filter(m => ['upcoming', 'due'].includes(m.status)).length,
    overdue: maintenance.filter(m => m.status === 'overdue').length,
    completed: maintenance.filter(m => m.status === 'completed').length,
  };

  const router = useRouter();

  const handleBookService = (id: string) => {
    router.push(`/portal/bookings/new?maintenance=${id}`);
  };

  const handleViewDetails = (id: string) => {
    router.push(`/portal/maintenance/${id}`);
  };

  if (isLoading) {
    return (
      <PortalPageWrapper title='Manutenzione' customer={customer || undefined}>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full'
          />
        </div>
      </PortalPageWrapper>
    );
  }

  if (error) {
    return (
      <PortalPageWrapper title='Manutenzione' customer={customer || undefined}>
        <div className='text-center py-16'>
          <p className='text-[var(--status-error)] mb-4'>{error}</p>
          <button
            onClick={() => mutate()}
            className='text-[var(--brand)] hover:underline'
          >
            Riprova
          </button>
        </div>
      </PortalPageWrapper>
    );
  }

  return (
    <PortalPageWrapper
      title='Manutenzione Programmata'
      subtitle='Gestisci le scadenze di manutenzione dei tuoi veicoli'
      customer={customer || undefined}
      action={
        <Link href='/portal/bookings/new'>
          <AppleButton icon={<Plus className='h-4 w-4' />}>Prenota Servizio</AppleButton>
        </Link>
      }
    >
      {/* Stats */}
      <div className='grid grid-cols-3 gap-4 mb-6'>
        <div className='p-4 bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)] rounded-2xl'>
          <div className='flex items-center gap-2 mb-1'>
            <Clock className='h-5 w-5 text-[var(--brand)]' />
            <span className='text-2xl font-bold text-[var(--brand)]'>{stats.upcoming}</span>
          </div>
          <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>In programma</p>
        </div>
        <div className='p-4 bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] rounded-2xl'>
          <div className='flex items-center gap-2 mb-1'>
            <AlertTriangle className='h-5 w-5 text-[var(--status-error)]' />
            <span className='text-2xl font-bold text-[var(--status-error)]'>{stats.overdue}</span>
          </div>
          <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>In ritardo</p>
        </div>
        <div className='p-4 bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] rounded-2xl'>
          <div className='flex items-center gap-2 mb-1'>
            <CheckCircle className='h-5 w-5 text-[var(--status-success)]' />
            <span className='text-2xl font-bold text-[var(--status-success)]'>{stats.completed}</span>
          </div>
          <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Completate</p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap items-center gap-3 mb-6'>
        <div className='flex items-center gap-2 p-1 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-xl shadow-apple'>
          {(['upcoming', 'all', 'completed', 'overdue'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  filter === f
                    ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-sm'
                    : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]'
                }
              `}
            >
              {f === 'all' && 'Tutte'}
              {f === 'upcoming' && 'In programma'}
              {f === 'completed' && 'Completate'}
              {f === 'overdue' && 'In ritardo'}
            </button>
          ))}
        </div>
      </div>

      {/* Overdue Alert */}
      {stats.overdue > 0 && filter !== 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6 p-4 bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]/50 rounded-2xl flex items-center gap-3'
        >
          <AlertTriangle className='h-5 w-5 text-[var(--status-error)] flex-shrink-0' />
          <div className='flex-1'>
            <p className='font-medium text-[var(--status-error)]'>
              Hai {stats.overdue} manutenzion{stats.overdue === 1 ? 'e' : 'i'} in ritardo
            </p>
            <p className='text-sm text-[var(--status-error)]/80'>
              Prenota al più presto per garantire la sicurezza del tuo veicolo
            </p>
          </div>
          <Link href='/portal/bookings/new'>
            <AppleButton size='sm'>Prenota Ora</AppleButton>
          </Link>
        </motion.div>
      )}

      {/* Maintenance List */}
      <MaintenanceList
        maintenances={filteredMaintenance}
        onBookService={handleBookService}
        onViewDetails={handleViewDetails}
      />
    </PortalPageWrapper>
  );
}
