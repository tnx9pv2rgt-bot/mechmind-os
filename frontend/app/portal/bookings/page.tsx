'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { Plus, Filter, Calendar } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { PortalPageWrapper } from '@/components/portal';
import { BookingList } from '@/components/portal';
import { Pagination } from '@/components/ui/pagination';
import { Booking, Customer } from '@/lib/types/portal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalBookingsPage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [customer] = useState<Customer | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: rawData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<{ data: Booking[] }>('/api/portal/bookings', fetcher);

  const bookings = rawData?.data || [];
  const error = swrError
    ? swrError instanceof Error
      ? swrError.message
      : 'Errore nel caricamento delle prenotazioni'
    : null;

  const filteredBookings = useMemo(() => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return bookings.filter(
          b =>
            new Date(b.scheduledDate) >= now &&
            ['pending', 'confirmed', 'in_progress'].includes(b.status)
        );
      case 'past':
        return bookings.filter(
          b =>
            new Date(b.scheduledDate) < now ||
            ['completed', 'cancelled', 'no_show'].includes(b.status)
        );
      default:
        return bookings;
    }
  }, [filter, bookings]);

  const handleCancel = (id: string) => {
    setCancelBookingId(id);
    setCancelConfirmOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancelBookingId) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/bookings/${cancelBookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) {
        throw new Error('Errore dal server');
      }
      await mutate(
        current =>
          current
            ? {
                ...current,
                data: current.data.map(b =>
                  b.id === cancelBookingId ? { ...b, status: 'cancelled' as Booking['status'] } : b
                ),
              }
            : current,
        false
      );
      toast.success('Prenotazione cancellata');
    } catch {
      toast.error('Errore durante la cancellazione della prenotazione');
    } finally {
      setCancelLoading(false);
      setCancelBookingId(null);
    }
  };

  const router = useRouter();

  const handleReschedule = (id: string) => {
    router.push(`/portal/bookings/new?reschedule=${id}`);
  };

  const handleViewDetails = (id: string) => {
    router.push(`/portal/bookings/${id}`);
  };

  if (isLoading) {
    return (
      <PortalPageWrapper title='Prenotazioni' customer={customer || undefined}>
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
      <PortalPageWrapper title='Prenotazioni' customer={customer || undefined}>
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
      title='Le tue Prenotazioni'
      subtitle='Gestisci i tuoi appuntamenti in officina'
      customer={customer || undefined}
      action={
        <Link href='/portal/bookings/new'>
          <AppleButton icon={<Plus className='h-4 w-4' />}>Nuova Prenotazione</AppleButton>
        </Link>
      }
    >
      {/* Filters */}
      <div className='flex flex-wrap items-center gap-3 mb-6'>
        <div className='flex items-center gap-2 p-1 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] rounded-xl shadow-apple'>
          {(['all', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
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
              {f === 'upcoming' && 'In arrivo'}
              {f === 'past' && 'Passate'}
            </button>
          ))}
        </div>

        <div className='flex items-center gap-2 text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
          <Calendar className='h-4 w-4' />
          <span>{filteredBookings.length} prenotazioni</span>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <>
          <BookingList
            bookings={filteredBookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
            onCancel={handleCancel}
            onReschedule={handleReschedule}
            onViewDetails={handleViewDetails}
          />
          <Pagination
            page={page}
            totalPages={Math.ceil(filteredBookings.length / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </>
      ) : (
        <div className='text-center py-16'>
          <Calendar className='h-16 w-16 mx-auto text-[var(--text-tertiary)]/30 mb-4' />
          <h3 className='text-lg font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2'>
            Nessuna prenotazione trovata
          </h3>
          <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-6'>
            {filter === 'upcoming'
              ? 'Non hai prenotazioni in arrivo'
              : filter === 'past'
                ? 'Non hai prenotazioni passate'
                : 'Non hai ancora effettuato prenotazioni'}
          </p>
          <Link href='/portal/bookings/new'>
            <AppleButton icon={<Plus className='h-4 w-4' />}>Prenota Ora</AppleButton>
          </Link>
        </div>
      )}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title='Cancella prenotazione'
        description='Sei sicuro di voler cancellare questa prenotazione?'
        confirmLabel='Cancella'
        variant='danger'
        onConfirm={confirmCancel}
        loading={cancelLoading}
      />
    </PortalPageWrapper>
  );
}
