'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Users,
  Loader2,
  Warehouse,
  AlertCircle,
  Plus,
  X,
  Search,
  Wrench,
  Clock,
} from 'lucide-react';
import { Calendar, dateFnsLocalizer, View, type SlotInfo } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { useSearchCustomers, useCreateBooking } from '@/hooks/useApi';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const DnDCalendar = withDragAndDrop(Calendar);

const locales = { 'it-IT': it };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: it }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'booking' | 'work_order';
  status: string;
  customerName: string;
  vehiclePlate: string;
  resourceId: string;
}

interface ApiCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'booking' | 'work_order';
  status: string;
  customerName: string;
  vehiclePlate: string;
  resourceId: string;
}

interface CalendarStats {
  todayBookings: number;
  availableTechnicians: number;
  occupiedBays: number;
  totalBays: number;
}

const bookingStatusColors: Record<string, string> = {
  confirmed: '#34c759',
  in_progress: '#007aff',
  'in-progress': '#007aff',
  pending: '#ff9500',
  cancelled: '#ff3b30',
  completed: '#30d158',
  no_show: '#8e8e93',
};

const workOrderColor = '#ff9f0a';

const messages = {
  allDay: 'Tutto il giorno',
  previous: 'Precedente',
  next: 'Successivo',
  today: 'Oggi',
  month: 'Mese',
  week: 'Settimana',
  day: 'Giorno',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Ora',
  event: 'Evento',
  noEventsInRange: 'Nessuna prenotazione in questo periodo.',
  showMore: (total: number) => `+${total} altre`,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

interface QuickAddState {
  isOpen: boolean;
  slotStart: Date | null;
  slotEnd: Date | null;
  customerSearch: string;
  selectedCustomerId: string;
  selectedCustomerName: string;
  service: string;
  isSubmitting: boolean;
}

export default function CalendarPage(): React.JSX.Element {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('week');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = (): void => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force day view on mobile
  useEffect(() => {
    if (isMobile && currentView !== 'day' && currentView !== 'agenda') {
      setCurrentView('day');
    }
  }, [isMobile, currentView]);

  // Quick add state
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({
    isOpen: false,
    slotStart: null,
    slotEnd: null,
    customerSearch: '',
    selectedCustomerId: '',
    selectedCustomerName: '',
    service: '',
    isSubmitting: false,
  });

  const { data: searchResults } = useSearchCustomers(quickAdd.customerSearch);
  const createBooking = useCreateBooking();

  // Build date range params based on current view
  const dateParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (currentView === 'month') {
      params.from = subDays(startOfMonth(currentDate), 7).toISOString().split('T')[0];
      params.to = addDays(endOfMonth(currentDate), 7).toISOString().split('T')[0];
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate, { locale: it });
      params.from = subDays(weekStart, 1).toISOString().split('T')[0];
      params.to = addDays(weekStart, 8).toISOString().split('T')[0];
    } else {
      params.from = currentDate.toISOString().split('T')[0];
      params.to = currentDate.toISOString().split('T')[0];
    }
    return params;
  }, [currentDate, currentView]);

  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
    mutate: mutateEvents,
  } = useSWR<{ data?: ApiCalendarEvent[] } | ApiCalendarEvent[]>(
    `/api/dashboard/calendar/events?from=${dateParams.from}&to=${dateParams.to}`,
    fetcher
  );

  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<{ data?: CalendarStats } | CalendarStats>('/api/bookings/calendar/stats', fetcher);

  const isLoading = eventsLoading || statsLoading;

  const apiEvents: ApiCalendarEvent[] = useMemo(() => {
    if (!eventsData) return [];
    const list = (eventsData as { data?: ApiCalendarEvent[] }).data || eventsData || [];
    return Array.isArray(list) ? list : [];
  }, [eventsData]);

  const stats: CalendarStats = useMemo(() => {
    if (!statsData)
      return { todayBookings: 0, availableTechnicians: 0, occupiedBays: 0, totalBays: 0 };
    const d = (statsData as { data?: CalendarStats }).data || statsData || {};
    return {
      todayBookings: (d as CalendarStats).todayBookings || 0,
      availableTechnicians: (d as CalendarStats).availableTechnicians || 0,
      occupiedBays: (d as CalendarStats).occupiedBays || 0,
      totalBays: (d as CalendarStats).totalBays || 0,
    };
  }, [statsData]);

  const events: CalendarEvent[] = useMemo(
    () =>
      apiEvents.map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      })),
    [apiEvents]
  );

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const isWorkOrder = event.type === 'work_order';
      const color = isWorkOrder
        ? workOrderColor
        : bookingStatusColors[event.status] || '#8e8e93';
      return {
        style: {
          backgroundColor: color,
          borderRadius: '8px',
          opacity: 0.9,
          color: 'white',
          border: isWorkOrder ? '2px dashed rgba(255,255,255,0.4)' : 'none',
          fontSize: '12px',
          padding: '2px 6px',
        },
      };
    },
    []
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (event.type === 'work_order') {
        router.push(`/dashboard/work-orders/${event.id}`);
      } else {
        router.push(`/dashboard/bookings/${event.id}`);
      }
    },
    [router]
  );

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      setQuickAdd({
        isOpen: true,
        slotStart: slotInfo.start as Date,
        slotEnd: slotInfo.end as Date,
        customerSearch: '',
        selectedCustomerId: '',
        selectedCustomerName: '',
        service: '',
        isSubmitting: false,
      });
    },
    []
  );

  const handleQuickAddSubmit = useCallback(async () => {
    if (!quickAdd.selectedCustomerId || !quickAdd.slotStart || !quickAdd.service) {
      toast.error('Completa tutti i campi obbligatori');
      return;
    }

    setQuickAdd(prev => ({ ...prev, isSubmitting: true }));

    try {
      await createBooking.mutateAsync({
        customerId: quickAdd.selectedCustomerId,
        slotId: '',
        scheduledDate: quickAdd.slotStart.toISOString(),
        durationMinutes: quickAdd.slotEnd
          ? Math.round((quickAdd.slotEnd.getTime() - quickAdd.slotStart.getTime()) / 60000)
          : 60,
        notes: quickAdd.service,
        source: 'calendar',
      });
      toast.success('Prenotazione creata con successo');
      setQuickAdd(prev => ({ ...prev, isOpen: false }));
      mutateEvents();
    } catch {
      toast.error('Errore nella creazione della prenotazione');
    } finally {
      setQuickAdd(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [quickAdd, createBooking, mutateEvents]);

  const handleEventDrop = useCallback(
    async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      try {
        const endpoint = event.type === 'work_order'
          ? `/api/work-orders/${event.id}`
          : `/api/bookings/${event.id}/reschedule`;
        const res = await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: (start as Date).toISOString(),
            endTime: (end as Date).toISOString(),
          }),
        });
        if (!res.ok) throw new Error('Errore spostamento');
        toast.success('Evento spostato con successo');
        mutateEvents();
      } catch {
        toast.error("Errore nello spostamento dell'evento");
        mutateEvents();
      }
    },
    [mutateEvents]
  );

  const handleEventResize = useCallback(
    async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      try {
        const endpoint = event.type === 'work_order'
          ? `/api/work-orders/${event.id}`
          : `/api/bookings/${event.id}/reschedule`;
        const res = await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: (start as Date).toISOString(),
            endTime: (end as Date).toISOString(),
          }),
        });
        if (!res.ok) throw new Error('Errore ridimensionamento');
        toast.success('Durata aggiornata');
        mutateEvents();
      } catch {
        toast.error("Errore nel ridimensionamento dell'evento");
        mutateEvents();
      }
    },
    [mutateEvents]
  );

  const sidebarStats = [
    {
      label: 'Prenotazioni oggi',
      value: String(stats.todayBookings),
      icon: CalendarIcon,
      color: 'bg-apple-blue',
    },
    {
      label: 'Tecnici disponibili',
      value: String(stats.availableTechnicians),
      icon: Users,
      color: 'bg-apple-green',
    },
    {
      label: 'Bay occupati',
      value: `${stats.occupiedBays}/${stats.totalBays}`,
      icon: Warehouse,
      color: 'bg-apple-orange',
    },
  ];

  const serviceOptions = [
    { value: 'Tagliando', label: 'Tagliando' },
    { value: 'Revisione', label: 'Revisione' },
    { value: 'Riparazione', label: 'Riparazione' },
    { value: 'Diagnosi', label: 'Diagnosi' },
    { value: 'Pneumatici', label: 'Pneumatici' },
    { value: 'Carrozzeria', label: 'Carrozzeria' },
    { value: 'Altro', label: 'Altro' },
  ];

  return (
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Calendario</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Visualizza e gestisci prenotazioni e ordini di lavoro
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton
              variant='secondary'
              icon={<CalendarIcon className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/bookings')}
            >
              Lista
            </AppleButton>
            <AppleButton
              icon={<Plus className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/bookings/new')}
            >
              Nuova Prenotazione
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div className='p-4 sm:p-8' initial='hidden' animate='visible' variants={containerVariants}>
        <div className='flex flex-col lg:flex-row gap-6'>
          {/* Sidebar Stats */}
          <motion.div className='lg:w-72 space-y-4' variants={containerVariants}>
            <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>Oggi</h3>
            {sidebarStats.map(stat => (
              <motion.div key={stat.label} variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardContent>
                    <div className='flex items-center gap-4'>
                      <div
                        className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}
                      >
                        <stat.icon className='h-5 w-5 text-white' />
                      </div>
                      <div>
                        <p className='text-title-1 font-bold text-apple-dark dark:text-[#ececec]'>
                          {isLoading ? '...' : stat.value}
                        </p>
                        <p className='text-footnote text-apple-gray dark:text-[#636366]'>
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            ))}

            {/* Legend */}
            <motion.div variants={cardVariants}>
              <AppleCard hover={false}>
                <AppleCardHeader>
                  <h3 className='text-callout font-semibold text-apple-dark dark:text-[#ececec]'>
                    Legenda
                  </h3>
                </AppleCardHeader>
                <AppleCardContent>
                  <div className='space-y-2'>
                    <p className='text-xs font-semibold text-apple-gray dark:text-[#636366] uppercase tracking-wider mb-1'>
                      Prenotazioni
                    </p>
                    {[
                      { label: 'Confermato', color: '#34c759' },
                      { label: 'In corso', color: '#007aff' },
                      { label: 'In attesa', color: '#ff9500' },
                      { label: 'Completato', color: '#30d158' },
                      { label: 'Annullato', color: '#ff3b30' },
                      { label: 'Non presentato', color: '#8e8e93' },
                    ].map(item => (
                      <div key={item.label} className='flex items-center gap-2'>
                        <div
                          className='w-3 h-3 rounded-full'
                          style={{ backgroundColor: item.color }}
                        />
                        <span className='text-footnote text-apple-gray dark:text-[#636366]'>
                          {item.label}
                        </span>
                      </div>
                    ))}
                    <p className='text-xs font-semibold text-apple-gray dark:text-[#636366] uppercase tracking-wider mb-1 mt-3'>
                      Ordini di Lavoro
                    </p>
                    <div className='flex items-center gap-2'>
                      <div
                        className='w-3 h-3 rounded-full border-2 border-dashed'
                        style={{ backgroundColor: workOrderColor, borderColor: 'rgba(255,255,255,0.5)' }}
                      />
                      <span className='text-footnote text-apple-gray dark:text-[#636366]'>
                        OdL (arancione)
                      </span>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </motion.div>

          {/* Calendar */}
          <motion.div className='flex-1' variants={cardVariants}>
            <AppleCard hover={false}>
              <AppleCardContent>
                {eventsError || statsError ? (
                  <div className='flex flex-col items-center justify-center py-24 text-center'>
                    <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                    <p className='text-body text-apple-gray dark:text-[#636366]'>
                      Impossibile caricare il calendario
                    </p>
                    <AppleButton
                      variant='ghost'
                      className='mt-4'
                      onClick={() => { mutateEvents(); }}
                    >
                      Riprova
                    </AppleButton>
                  </div>
                ) : eventsLoading ? (
                  <div className='flex items-center justify-center py-24'>
                    <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                  </div>
                ) : (
                  <div className='h-[500px] sm:h-[700px] calendar-container'>
                    <DnDCalendar
                      localizer={localizer}
                      events={events}
                      startAccessor='start'
                      endAccessor='end'
                      style={{ height: '100%' }}
                      date={currentDate}
                      view={currentView}
                      views={isMobile ? ['day', 'agenda'] : ['month', 'week', 'day', 'agenda']}
                      onNavigate={handleNavigate}
                      onView={handleViewChange}
                      onSelectEvent={handleSelectEvent}
                      onSelectSlot={handleSelectSlot}
                      selectable
                      eventPropGetter={eventStyleGetter}
                      messages={messages}
                      culture='it-IT'
                      min={new Date(2024, 0, 1, 7, 0)}
                      max={new Date(2024, 0, 1, 20, 0)}
                      step={15}
                      timeslots={4}
                      onEventDrop={handleEventDrop}
                      onEventResize={handleEventResize}
                      draggableAccessor={() => true}
                      resizable
                    />
                  </div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick-add popover dialog */}
      {quickAdd.isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6'
          >
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                Prenotazione Rapida
              </h3>
              <button
                onClick={() => setQuickAdd(prev => ({ ...prev, isOpen: false }))}
                className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#353535] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'
              >
                <X className='h-5 w-5 text-apple-gray' />
              </button>
            </div>

            {/* Time info */}
            {quickAdd.slotStart && (
              <div className='flex items-center gap-2 p-3 bg-apple-light-gray/50 dark:bg-[#353535] rounded-xl mb-4'>
                <Clock className='h-4 w-4 text-apple-blue' />
                <span className='text-sm text-apple-dark dark:text-[#ececec]'>
                  {quickAdd.slotStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}{' '}
                  alle {quickAdd.slotStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  {quickAdd.slotEnd && (
                    <> - {quickAdd.slotEnd.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </span>
              </div>
            )}

            {/* Customer search */}
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-apple-dark dark:text-[#ececec] mb-1'>
                  Cliente *
                </label>
                {quickAdd.selectedCustomerId ? (
                  <div className='flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl'>
                    <span className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                      {quickAdd.selectedCustomerName}
                    </span>
                    <button
                      onClick={() => setQuickAdd(prev => ({
                        ...prev,
                        selectedCustomerId: '',
                        selectedCustomerName: '',
                        customerSearch: '',
                      }))}
                      className='p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/30'
                    >
                      <X className='h-4 w-4 text-blue-500' />
                    </button>
                  </div>
                ) : (
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray' />
                    <Input
                      placeholder='Cerca cliente...'
                      value={quickAdd.customerSearch}
                      onChange={e => setQuickAdd(prev => ({ ...prev, customerSearch: e.target.value }))}
                      className='pl-10 h-11 rounded-xl border border-apple-border/30 dark:border-[#424242] bg-white dark:bg-[#353535] text-apple-dark dark:text-[#ececec]'
                    />
                    {searchResults && searchResults.length > 0 && quickAdd.customerSearch.length >= 2 && (
                      <div className='absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-[#353535] rounded-xl shadow-lg border border-apple-border/20 dark:border-[#424242] max-h-40 overflow-y-auto'>
                        {searchResults.map(customer => (
                          <button
                            key={customer.id}
                            type='button'
                            onClick={() => setQuickAdd(prev => ({
                              ...prev,
                              selectedCustomerId: customer.id,
                              selectedCustomerName: `${customer.firstName} ${customer.lastName}`,
                              customerSearch: '',
                            }))}
                            className='w-full text-left px-4 py-3 hover:bg-apple-light-gray dark:hover:bg-[#424242] transition-colors text-sm text-apple-dark dark:text-[#ececec] min-h-[44px]'
                          >
                            {customer.firstName} {customer.lastName}
                            {customer.phone && (
                              <span className='text-apple-gray dark:text-[#636366] ml-2'>
                                {customer.phone}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Service select */}
              <div>
                <label className='block text-sm font-medium text-apple-dark dark:text-[#ececec] mb-1'>
                  Servizio *
                </label>
                <select
                  value={quickAdd.service}
                  onChange={e => setQuickAdd(prev => ({ ...prev, service: e.target.value }))}
                  className='w-full h-11 px-4 rounded-xl border border-apple-border/30 dark:border-[#424242] bg-white dark:bg-[#353535] text-apple-dark dark:text-[#ececec] text-sm'
                >
                  <option value=''>Seleziona servizio...</option>
                  {serviceOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className='flex gap-3 pt-2'>
                <AppleButton
                  variant='secondary'
                  className='flex-1 min-h-[44px]'
                  onClick={() => setQuickAdd(prev => ({ ...prev, isOpen: false }))}
                >
                  Annulla
                </AppleButton>
                <AppleButton
                  className='flex-1 min-h-[44px]'
                  onClick={handleQuickAddSubmit}
                  disabled={quickAdd.isSubmitting || !quickAdd.selectedCustomerId || !quickAdd.service}
                  loading={quickAdd.isSubmitting}
                >
                  Crea Prenotazione
                </AppleButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <style jsx global>{`
        .calendar-container .rbc-toolbar {
          margin-bottom: 16px;
          padding: 8px 0;
          flex-wrap: wrap;
          gap: 8px;
        }
        .calendar-container .rbc-toolbar button {
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 13px;
          border: 1px solid #e5e7eb;
          background: transparent;
          color: inherit;
          min-height: 44px;
        }
        .calendar-container .rbc-toolbar button:hover {
          background: #f3f4f6;
        }
        .calendar-container .rbc-toolbar button.rbc-active {
          background: #007aff;
          color: white;
          border-color: #007aff;
        }
        .calendar-container .rbc-header {
          padding: 8px 4px;
          font-size: 13px;
          font-weight: 600;
        }
        .calendar-container .rbc-time-slot {
          min-height: 24px;
        }
        .calendar-container .rbc-event {
          border-radius: 8px !important;
        }
        .calendar-container .rbc-today {
          background-color: rgba(0, 122, 255, 0.05);
        }
        :global(.dark) .calendar-container .rbc-toolbar button {
          border-color: #424242;
          color: #ececec;
        }
        :global(.dark) .calendar-container .rbc-toolbar button:hover {
          background: #353535;
        }
        :global(.dark) .calendar-container .rbc-header {
          color: #ececec;
        }
        :global(.dark) .calendar-container .rbc-off-range-bg {
          background: #1a1a1a;
        }
        :global(.dark) .calendar-container .rbc-today {
          background-color: rgba(0, 122, 255, 0.1);
        }
        :global(.dark) .calendar-container .rbc-time-content,
        :global(.dark) .calendar-container .rbc-time-header,
        :global(.dark) .calendar-container .rbc-month-view,
        :global(.dark) .calendar-container .rbc-agenda-view {
          border-color: #424242;
        }
        :global(.dark) .calendar-container .rbc-day-bg + .rbc-day-bg,
        :global(.dark) .calendar-container .rbc-month-row + .rbc-month-row,
        :global(.dark) .calendar-container .rbc-header + .rbc-header,
        :global(.dark) .calendar-container .rbc-time-header-content {
          border-color: #424242;
        }
        :global(.dark) .calendar-container .rbc-timeslot-group {
          border-color: #424242;
        }
        :global(.dark) .calendar-container .rbc-time-slot {
          border-color: #333;
        }
        :global(.dark) .calendar-container .rbc-label {
          color: #636366;
        }
        :global(.dark) .calendar-container .rbc-date-cell {
          color: #ececec;
        }
        @media (max-width: 767px) {
          .calendar-container .rbc-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .calendar-container .rbc-toolbar-label {
            text-align: center;
            padding: 4px 0;
          }
        }
      `}</style>
    </div>
  );
}
