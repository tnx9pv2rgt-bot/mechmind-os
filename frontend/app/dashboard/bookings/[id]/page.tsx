'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  Car,
  Wrench,
  CheckCircle2,
  X,
  Edit3,
  Printer,
  AlertCircle,
  Loader2,
  Clock3,
  CheckCircle,
  FileText,
  History,
  PlayCircle,
  UserX,
  ClipboardList,
} from 'lucide-react';
import { useBooking, useUpdateBooking } from '@/hooks/useApi';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  StatusTimeline,
  type TimelineEvent,
  type TimelineStepConfig,
} from '@/components/ui/status-timeline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

/** Valid status transitions for the booking state machine. */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function canTransitionTo(currentStatus: string, targetStatus: string): boolean {
  return (ALLOWED_TRANSITIONS[currentStatus] ?? []).includes(targetStatus);
}

const statusConfig: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
    textColor: string;
  }
> = {
  pending: { label: 'In attesa', color: 'bg-amber-500', icon: Clock3, textColor: 'text-amber-600' },
  confirmed: {
    label: 'Confermato',
    color: 'bg-green-500',
    icon: CheckCircle,
    textColor: 'text-green-600',
  },
  in_progress: {
    label: 'In lavorazione',
    color: 'bg-blue-500',
    icon: Wrench,
    textColor: 'text-blue-600',
  },
  completed: {
    label: 'Completato',
    color: 'bg-blue-600',
    icon: CheckCircle2,
    textColor: 'text-blue-600',
  },
  cancelled: { label: 'Annullato', color: 'bg-red-500', icon: X, textColor: 'text-red-600' },
  no_show: { label: 'Non presentato', color: 'bg-gray-400', icon: UserX, textColor: 'text-gray-600' },
};

const BOOKING_TIMELINE_STEPS: TimelineStepConfig[] = [
  { key: 'pending', label: 'In attesa conferma', icon: Clock3 },
  { key: 'confirmed', label: 'Confermata', icon: CheckCircle },
  { key: 'in_progress', label: 'In lavorazione', icon: Wrench },
  { key: 'completed', label: 'Completata', icon: CheckCircle2 },
];

const BOOKING_TIMELINE_STEPS_CANCELLED: TimelineStepConfig[] = [
  { key: 'pending', label: 'In attesa conferma', icon: Clock3 },
  { key: 'confirmed', label: 'Confermata', icon: CheckCircle },
  { key: 'cancelled', label: 'Annullata', icon: X },
];

const BOOKING_TIMELINE_STEPS_NO_SHOW: TimelineStepConfig[] = [
  { key: 'pending', label: 'In attesa conferma', icon: Clock3 },
  { key: 'confirmed', label: 'Confermata', icon: CheckCircle },
  { key: 'no_show', label: 'Non presentato', icon: UserX },
];

function buildTimelineEvents(booking: {
  status: string;
  createdAt: string;
  updatedAt: string;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: 'created', status: 'pending', timestamp: booking.createdAt },
  ];

  const statusOrder = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
  const currentIdx = statusOrder.indexOf(booking.status);

  if (currentIdx >= 1 && booking.status !== 'cancelled' && booking.status !== 'no_show') {
    events.push({ id: 'confirmed', status: 'confirmed', timestamp: booking.updatedAt });
  }
  if (currentIdx >= 2 && booking.status !== 'cancelled' && booking.status !== 'no_show') {
    events.push({ id: 'in_progress', status: 'in_progress', timestamp: booking.updatedAt });
  }
  if (currentIdx >= 3 && booking.status === 'completed') {
    events.push({ id: 'completed', status: 'completed', timestamp: booking.updatedAt });
  }
  if (booking.status === 'cancelled') {
    events.push({ id: 'cancelled', status: 'cancelled', timestamp: booking.updatedAt });
  }
  if (booking.status === 'no_show') {
    events.push({ id: 'no_show', status: 'no_show', timestamp: booking.updatedAt });
  }

  return events;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const cancelReasonSchema = z.object({
  reason: z.string().min(1, 'Inserisci un motivo per la cancellazione'),
});
type CancelReasonForm = z.infer<typeof cancelReasonSchema>;

const rescheduleSchema = z.object({
  scheduledDate: z.string().min(1, 'Data e orario obbligatori'),
});
type RescheduleForm = z.infer<typeof rescheduleSchema>;

const editBookingSchema = z.object({
  scheduledDate: z.string().min(1, 'Data e orario obbligatori'),
  notes: z.string().optional(),
});
type EditBookingForm = z.infer<typeof editBookingSchema>;

export default function BookingDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const updateBooking = useUpdateBooking();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [noShowConfirmOpen, setNoShowConfirmOpen] = useState(false);

  const cancelForm = useForm<CancelReasonForm>({
    resolver: zodResolver(cancelReasonSchema),
    defaultValues: { reason: '' },
  });

  const rescheduleForm = useForm<RescheduleForm>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: { scheduledDate: '' },
  });

  const editForm = useForm<EditBookingForm>({
    resolver: zodResolver(editBookingSchema),
    defaultValues: { scheduledDate: '', notes: '' },
  });

  const openEditDialog = (): void => {
    editForm.reset({
      notes: booking?.notes ?? '',
      scheduledDate: booking?.scheduledAt
        ? new Date(booking.scheduledAt).toISOString().slice(0, 16)
        : '',
    });
    setEditDialogOpen(true);
  };

  const openRescheduleDialog = (): void => {
    rescheduleForm.reset({
      scheduledDate: booking?.scheduledAt
        ? new Date(booking.scheduledAt).toISOString().slice(0, 16)
        : '',
    });
    setRescheduleDialogOpen(true);
  };

  const handleSaveEdit = (data: EditBookingForm): void => {
    const payload: Record<string, unknown> = { id: bookingId };
    if (data.notes !== (booking?.notes ?? '')) payload.notes = data.notes;
    if (data.scheduledDate) payload.scheduledAt = new Date(data.scheduledDate).toISOString();

    updateBooking.mutate(payload as { id: string } & Record<string, unknown>, {
      onSuccess: () => {
        toast.success('Prenotazione aggiornata con successo');
        setEditDialogOpen(false);
      },
      onError: () => toast.error("Errore nell'aggiornamento della prenotazione"),
    });
  };

  const handleReschedule = (data: RescheduleForm): void => {
    updateBooking.mutate(
      { id: bookingId, scheduledAt: new Date(data.scheduledDate).toISOString() },
      {
        onSuccess: () => {
          toast.success('Prenotazione riprogrammata con successo');
          setRescheduleDialogOpen(false);
        },
        onError: () => toast.error('Errore nella riprogrammazione'),
      },
    );
  };

  const handleConfirm = (): void => {
    updateBooking.mutate(
      { id: bookingId, status: 'confirmed' },
      {
        onSuccess: () => toast.success('Prenotazione confermata'),
        onError: () => toast.error('Errore nella conferma della prenotazione'),
      },
    );
  };

  const handleStartProgress = (): void => {
    updateBooking.mutate(
      { id: bookingId, status: 'in_progress' },
      {
        onSuccess: () => toast.success('Lavoro avviato'),
        onError: () => toast.error("Errore nell'avvio del lavoro"),
      },
    );
  };

  const handleComplete = (): void => {
    updateBooking.mutate(
      { id: bookingId, status: 'completed' },
      {
        onSuccess: () => toast.success('Lavoro completato con successo'),
        onError: () => toast.error('Errore nel completamento del lavoro'),
      },
    );
  };

  const handleCancelWithReason = (data: CancelReasonForm): void => {
    updateBooking.mutate(
      { id: bookingId, status: 'cancelled', cancelReason: data.reason },
      {
        onSuccess: () => {
          toast.success('Prenotazione annullata');
          setCancelDialogOpen(false);
          cancelForm.reset();
        },
        onError: () => toast.error("Errore nell'annullamento della prenotazione"),
      },
    );
  };

  const handleNoShow = (): void => {
    updateBooking.mutate(
      { id: bookingId, status: 'no_show' },
      {
        onSuccess: () => {
          toast.success('Prenotazione segnata come non presentato');
          setNoShowConfirmOpen(false);
        },
        onError: () => toast.error('Errore nel cambio stato'),
      },
    );
  };

  const handleConvertToWorkOrder = async (): Promise<void> => {
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) throw new Error('Errore creazione ordine di lavoro');
      const data: { data?: { id?: string }; id?: string } = await res.json();
      const workOrderId = data.data?.id ?? data.id;
      toast.success('Ordine di lavoro creato con successo');
      if (workOrderId) {
        router.push(`/dashboard/work-orders/${workOrderId}`);
      }
    } catch {
      toast.error("Errore nella creazione dell'ordine di lavoro");
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
        <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
          Prenotazione non trovata
        </p>
        <AppleButton
          variant='ghost'
          onClick={() => router.push('/dashboard/bookings')}
        >
          Torna alle prenotazioni
        </AppleButton>
      </div>
    );
  }

  const status = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const scheduledDate = new Date(booking.scheduledAt);

  function getTimelineSteps(): TimelineStepConfig[] {
    if (booking?.status === 'cancelled') return BOOKING_TIMELINE_STEPS_CANCELLED;
    if (booking?.status === 'no_show') return BOOKING_TIMELINE_STEPS_NO_SHOW;
    return BOOKING_TIMELINE_STEPS;
  }

  return (
    <div className='min-h-screen bg-apple-light-gray dark:bg-[var(--surface-hover)]'>
      <header>
        <div className='px-4 sm:px-6 py-4'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Prenotazioni', href: '/dashboard/bookings' },
              { label: `#${booking.id.slice(0, 8)}` },
            ]}
          />
          <Link
            href='/dashboard/bookings'
            className='flex items-center gap-2 text-apple-gray dark:text-[var(--text-secondary)] hover:text-apple-dark transition-colors mb-3'
          >
            <ArrowLeft className='h-4 w-4' />
            <span className='text-footnote'>Torna alle prenotazioni</span>
          </Link>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>
                {booking.serviceName || booking.serviceCategory}
              </h1>
              <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-0.5'>
                {booking.id.slice(0, 8)} &bull; {booking.vehiclePlate} {booking.vehicleBrand || ''}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${status.color} text-white font-medium`}
            >
              <StatusIcon className='h-4 w-4' />
              <span>{status.label}</span>
            </div>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-6'>
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='grid grid-cols-1 lg:grid-cols-12 gap-6'
        >
          {/* LEFT - Customer & Vehicle */}
          <div className='lg:col-span-3 space-y-6'>
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
                    Cliente
                  </h2>
                  <div className='space-y-4'>
                    <p className='text-title-2 text-apple-dark dark:text-[var(--text-primary)]'>
                      {booking.customerName}
                    </p>
                    {booking.customerPhone && (
                      <div className='space-y-2 pt-2 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                        <a
                          href={`tel:${booking.customerPhone}`}
                          className='flex items-center gap-3 text-body text-apple-dark dark:text-[var(--text-primary)] hover:text-apple-blue transition-colors min-h-[44px]'
                        >
                          <Phone className='h-4 w-4 text-apple-gray dark:text-[var(--text-secondary)]' />
                          {booking.customerPhone}
                        </a>
                        <a
                          href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex items-center gap-3 text-body text-apple-dark dark:text-[var(--text-primary)] hover:text-apple-green transition-colors min-h-[44px]'
                        >
                          <MessageCircle className='h-4 w-4 text-apple-green' />
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
                    <Car className='h-5 w-5 text-apple-gray dark:text-[var(--text-secondary)]' />
                    Veicolo
                  </h2>
                  <div className='space-y-4'>
                    <div>
                      <p className='text-title-2 text-apple-dark dark:text-[var(--text-primary)]'>
                        {booking.vehicleBrand || ''} {booking.vehicleModel || ''}
                      </p>
                    </div>
                    <div className='grid grid-cols-2 gap-3 pt-2 border-t border-apple-border/20 dark:border-[var(--border-default)]'>
                      <div>
                        <p className='text-caption text-apple-gray dark:text-[var(--text-secondary)]'>
                          Targa
                        </p>
                        <p className='text-body font-mono text-apple-dark dark:text-[var(--text-primary)]'>
                          {booking.vehiclePlate}
                        </p>
                      </div>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>

          {/* CENTER - Details */}
          <div className='lg:col-span-6 space-y-6'>
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
                    Dettagli Appuntamento
                  </h2>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6'>
                    <div className='flex items-center gap-3 p-3 bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] rounded-xl'>
                      <div className='w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                        <Calendar className='h-5 w-5 text-apple-blue' />
                      </div>
                      <div>
                        <p className='text-caption text-apple-gray dark:text-[var(--text-secondary)]'>Data</p>
                        <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                          {scheduledDate.toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3 p-3 bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] rounded-xl'>
                      <div className='w-10 h-10 rounded-xl bg-apple-purple/10 flex items-center justify-center'>
                        <Clock className='h-5 w-5 text-apple-purple' />
                      </div>
                      <div>
                        <p className='text-caption text-apple-gray dark:text-[var(--text-secondary)]'>Orario</p>
                        <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>
                          {scheduledDate.toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='space-y-4'>
                    <div>
                      <p className='text-caption text-apple-gray dark:text-[var(--text-secondary)] mb-1'>
                        Servizio
                      </p>
                      <p className='text-body text-apple-dark dark:text-[var(--text-primary)]'>
                        {booking.serviceName || booking.serviceCategory}
                      </p>
                    </div>
                    {booking.notes && (
                      <div>
                        <p className='text-caption text-apple-gray dark:text-[var(--text-secondary)] mb-1'>
                          Note
                        </p>
                        <p className='text-body text-apple-dark dark:text-[var(--text-primary)] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 p-3 rounded-xl'>
                          {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4 flex items-center gap-2'>
                    <History className='h-5 w-5 text-apple-gray dark:text-[var(--text-secondary)]' />
                    Cronologia
                  </h2>
                  <StatusTimeline
                    currentStatus={booking.status}
                    events={buildTimelineEvents(booking)}
                    steps={getTimelineSteps()}
                    variant='tracker'
                    showActor={false}
                    compact
                  />
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>

          {/* RIGHT - Actions */}
          <div className='lg:col-span-3 space-y-6'>
            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
                    Azioni
                  </h2>
                  <div className='space-y-3'>
                    <AppleButton
                      variant='secondary'
                      className='w-full justify-start gap-3 min-h-[44px]'
                      onClick={openEditDialog}
                      disabled={booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'no_show'}
                    >
                      <Edit3 className='h-5 w-5' />
                      Modifica Prenotazione
                    </AppleButton>

                    <AppleButton
                      variant='secondary'
                      className='w-full justify-start gap-3 min-h-[44px]'
                      onClick={openRescheduleDialog}
                      disabled={booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'no_show'}
                    >
                      <Calendar className='h-5 w-5' />
                      Riprogramma
                    </AppleButton>

                    <AppleButton
                      variant='secondary'
                      className='w-full justify-start gap-3 min-h-[44px]'
                      onClick={handleConvertToWorkOrder}
                      disabled={booking.status === 'cancelled' || booking.status === 'no_show'}
                    >
                      <ClipboardList className='h-5 w-5' />
                      Converti in OdL
                    </AppleButton>

                    <AppleButton
                      variant='secondary'
                      className='w-full justify-start gap-3 min-h-[44px]'
                      onClick={() => window.print()}
                    >
                      <Printer className='h-5 w-5' />
                      Stampa
                    </AppleButton>
                  </div>
                  <div className='pt-4 mt-4 border-t border-apple-border/20 dark:border-[var(--border-default)] space-y-2'>
                    {canTransitionTo(booking.status, 'confirmed') && (
                      <AppleButton
                        className='w-full min-h-[44px]'
                        onClick={handleConfirm}
                        disabled={updateBooking.isPending}
                      >
                        <CheckCircle className='h-5 w-5 mr-2' />
                        Conferma Prenotazione
                      </AppleButton>
                    )}
                    {canTransitionTo(booking.status, 'in_progress') && (
                      <AppleButton
                        className='w-full min-h-[44px]'
                        onClick={handleStartProgress}
                        disabled={updateBooking.isPending}
                      >
                        <PlayCircle className='h-5 w-5 mr-2' />
                        Avvia Lavorazione
                      </AppleButton>
                    )}
                    {canTransitionTo(booking.status, 'completed') && (
                      <AppleButton
                        className='w-full min-h-[44px]'
                        onClick={handleComplete}
                        disabled={updateBooking.isPending}
                      >
                        <CheckCircle2 className='h-5 w-5 mr-2' />
                        Completa Lavoro
                      </AppleButton>
                    )}
                    {canTransitionTo(booking.status, 'no_show') && (
                      <AppleButton
                        variant='ghost'
                        className='w-full min-h-[44px] text-apple-gray dark:text-[var(--text-secondary)] hover:text-apple-dark dark:hover:text-[var(--text-primary)] hover:bg-apple-light-gray dark:hover:bg-[var(--surface-hover)]'
                        onClick={() => setNoShowConfirmOpen(true)}
                        disabled={updateBooking.isPending}
                      >
                        <UserX className='h-5 w-5 mr-2' />
                        Segna Non Presentato
                      </AppleButton>
                    )}
                    {canTransitionTo(booking.status, 'cancelled') && (
                      <AppleButton
                        variant='ghost'
                        className='w-full min-h-[44px] text-apple-red hover:text-apple-red hover:bg-red-50 dark:hover:bg-red-900/20'
                        onClick={() => setCancelDialogOpen(true)}
                        disabled={updateBooking.isPending}
                      >
                        <X className='h-5 w-5 mr-2' />
                        Annulla Prenotazione
                      </AppleButton>
                    )}
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div variants={cardVariants}>
              <AppleCard>
                <AppleCardContent>
                  <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
                    Preventivo
                  </h2>
                  <div className='space-y-3'>
                    <div className='pt-3 flex items-center justify-between'>
                      <span className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                        Costo Stimato
                      </span>
                      <span className='text-title-2 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                        {booking.estimatedCost
                          ? new Intl.NumberFormat('it-IT', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(booking.estimatedCost)
                          : '\u2014'}
                      </span>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Cancel dialog with reason */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <form onSubmit={cancelForm.handleSubmit(handleCancelWithReason)}>
            <DialogHeader>
              <DialogTitle>Annulla prenotazione</DialogTitle>
              <DialogDescription>
                Inserisci il motivo della cancellazione. Questa azione non può essere annullata.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <label
                htmlFor='cancel-reason'
                className='block text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1'
              >
                Motivo
              </label>
              <textarea
                id='cancel-reason'
                rows={3}
                {...cancelForm.register('reason')}
                placeholder='Inserisci il motivo della cancellazione...'
                className='w-full rounded-lg border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] px-3 py-2 text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue resize-none'
              />
              {cancelForm.formState.errors.reason && (
                <p className='text-footnote text-apple-red mt-1'>{cancelForm.formState.errors.reason.message}</p>
              )}
            </div>
            <DialogFooter>
              <AppleButton
                variant='secondary'
                onClick={() => setCancelDialogOpen(false)}
                disabled={updateBooking.isPending}
                type='button'
              >
                Indietro
              </AppleButton>
              <AppleButton
                type='submit'
                disabled={updateBooking.isPending}
                className='bg-apple-red hover:opacity-90 text-white'
              >
                {updateBooking.isPending ? 'Annullamento...' : 'Annulla Prenotazione'}
              </AppleButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <form onSubmit={rescheduleForm.handleSubmit(handleReschedule)}>
            <DialogHeader>
              <DialogTitle>Riprogramma prenotazione</DialogTitle>
              <DialogDescription>
                Seleziona una nuova data e orario per la prenotazione.
              </DialogDescription>
            </DialogHeader>
            <div className='py-4'>
              <label
                htmlFor='reschedule-date'
                className='block text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1'
              >
                Nuova data e orario
              </label>
              <input
                id='reschedule-date'
                type='datetime-local'
                {...rescheduleForm.register('scheduledDate')}
                className='w-full rounded-lg border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] px-3 py-2 text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue'
              />
              {rescheduleForm.formState.errors.scheduledDate && (
                <p className='text-footnote text-apple-red mt-1'>{rescheduleForm.formState.errors.scheduledDate.message}</p>
              )}
            </div>
            <DialogFooter>
              <AppleButton
                variant='secondary'
                onClick={() => setRescheduleDialogOpen(false)}
                disabled={updateBooking.isPending}
                type='button'
              >
                Annulla
              </AppleButton>
              <AppleButton
                type='submit'
                disabled={updateBooking.isPending}
              >
                {updateBooking.isPending ? 'Salvataggio...' : 'Riprogramma'}
              </AppleButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={editForm.handleSubmit(handleSaveEdit)}>
            <DialogHeader>
              <DialogTitle>Modifica Prenotazione</DialogTitle>
              <DialogDescription>
                Modifica i dettagli della prenotazione.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-2'>
              <div>
                <label
                  htmlFor='edit-scheduled-date'
                  className='block text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1'
                >
                  Data e Orario
                </label>
                <input
                  id='edit-scheduled-date'
                  type='datetime-local'
                  {...editForm.register('scheduledDate')}
                  className='w-full rounded-lg border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] px-3 py-2 text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue'
                />
                {editForm.formState.errors.scheduledDate && (
                  <p className='text-footnote text-apple-red mt-1'>{editForm.formState.errors.scheduledDate.message}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor='edit-notes'
                  className='block text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1'
                >
                  Note
                </label>
                <textarea
                  id='edit-notes'
                  rows={4}
                  {...editForm.register('notes')}
                  placeholder='Aggiungi note alla prenotazione...'
                  className='w-full rounded-lg border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] px-3 py-2 text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue resize-none'
                />
                {editForm.formState.errors.notes && (
                  <p className='text-footnote text-apple-red mt-1'>{editForm.formState.errors.notes.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <AppleButton
                variant='secondary'
                onClick={() => setEditDialogOpen(false)}
                disabled={updateBooking.isPending}
                type='button'
              >
                Annulla
              </AppleButton>
              <AppleButton
                type='submit'
                disabled={updateBooking.isPending || editForm.formState.isSubmitting}
              >
                {updateBooking.isPending ? 'Salvataggio...' : 'Salva modifiche'}
              </AppleButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* No-show confirm */}
      <ConfirmDialog
        open={noShowConfirmOpen}
        onOpenChange={setNoShowConfirmOpen}
        title='Segna come non presentato'
        description='Sei sicuro di voler segnare il cliente come non presentato? Questa azione non può essere annullata.'
        confirmLabel='Segna Non Presentato'
        variant='default'
        onConfirm={handleNoShow}
        loading={updateBooking.isPending}
      />
    </div>
  );
}
