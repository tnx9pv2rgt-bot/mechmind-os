'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion, AnimatePresence } from 'framer-motion';
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
  Clock,
  ChevronLeft,
  ChevronRight,
  List,
} from 'lucide-react';
import { Calendar, dateFnsLocalizer, View, type SlotInfo } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  eachDayOfInterval,
  getWeeksInMonth,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { useSearchCustomers, useCreateBooking } from '@/hooks/useApi';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// ─── Setup ──────────────────────────────────────────────────────────────────
const DnDCalendar = withDragAndDrop(Calendar);
const locales = { 'it-IT': it };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: it }),
  getDay,
  locales,
});

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── Status Colors (Apple HIG palette) ──────────────────────────────────────
const bookingStatusColors: Record<string, string> = {
  confirmed: '#34c759',
  in_progress: '#007aff',
  'in-progress': '#007aff',
  pending: '#ff9500',
  cancelled: '#ff3b30',
  completed: '#30d158',
  no_show: '#8e8e93',
};

const bookingStatusLabels: Record<string, string> = {
  confirmed: 'Confermato',
  in_progress: 'In corso',
  'in-progress': 'In corso',
  pending: 'In attesa',
  cancelled: 'Annullato',
  completed: 'Completato',
  no_show: 'Non presentato',
};

const workOrderColor = '#ff9f0a';

// ─── i18n ───────────────────────────────────────────────────────────────────
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

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// ─── Animations ─────────────────────────────────────────────────────────────
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Mini Calendar (Apple style) ────────────────────────────────────────────
function MiniCalendar({
  currentDate,
  onDateSelect,
  eventDates,
}: {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  eventDates: Set<string>;
}): React.JSX.Element {
  const [viewMonth, setViewMonth] = useState(startOfMonth(currentDate));

  useEffect(() => {
    setViewMonth(startOfMonth(currentDate));
  }, [currentDate]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const weeksCount = getWeeksInMonth(viewMonth, { weekStartsOn: 1 });
  const calEnd = addDays(calStart, weeksCount * 7 - 1);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Mese precedente"
        >
          <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {format(viewMonth, 'MMMM yyyy', { locale: it })}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Mese successivo"
        >
          <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-[var(--text-tertiary)] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const inMonth = isSameMonth(day, viewMonth);
          const selected = isSameDay(day, currentDate);
          const today = isToday(day);
          const hasEvents = eventDates.has(format(day, 'yyyy-MM-dd'));

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`
                relative flex flex-col items-center justify-center py-[5px] rounded-full text-[12px] transition-all duration-150
                ${!inMonth ? 'text-[var(--text-tertiary)] opacity-40' : 'text-[var(--text-primary)]'}
                ${selected ? 'bg-[#007aff] text-white font-semibold shadow-sm' : ''}
                ${today && !selected ? 'text-[#007aff] font-bold' : ''}
                ${!selected ? 'hover:bg-[var(--surface-hover)]' : ''}
              `}
            >
              {format(day, 'd')}
              {hasEvents && !selected && (
                <span className="absolute bottom-[2px] w-[4px] h-[4px] rounded-full bg-[#007aff]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Current Time Indicator ─────────────────────────────────────────────────
function useCurrentTimeUpdate(): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Custom Event Component ─────────────────────────────────────────────────
function CalendarEventComponent({ event }: { event: CalendarEvent }): React.JSX.Element {
  const isWorkOrder = event.type === 'work_order';
  return (
    <div className="flex items-center gap-1 overflow-hidden h-full px-[2px]">
      {isWorkOrder && (
        <span className="flex-shrink-0 w-[6px] h-[6px] rounded-full bg-white/70" />
      )}
      <span className="truncate text-[11px] leading-tight font-medium">
        {event.title}
      </span>
    </div>
  );
}

// ─── Service Options ────────────────────────────────────────────────────────
const serviceOptions = [
  { value: 'Tagliando', label: 'Tagliando' },
  { value: 'Revisione', label: 'Revisione' },
  { value: 'Riparazione', label: 'Riparazione' },
  { value: 'Diagnosi', label: 'Diagnosi' },
  { value: 'Pneumatici', label: 'Pneumatici' },
  { value: 'Carrozzeria', label: 'Carrozzeria' },
  { value: 'Altro', label: 'Altro' },
];

// ═════════════════════════════════════════════════════════════════════════════
// Main Calendar Page
// ═════════════════════════════════════════════════════════════════════════════
export default function CalendarPage(): React.JSX.Element {
  const router = useRouter();
  const now = useCurrentTimeUpdate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('week');
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  // Date range for API
  const dateParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (currentView === 'month') {
      params.from = subDays(startOfMonth(currentDate), 7).toISOString().split('T')[0];
      params.to = addDays(endOfMonth(currentDate), 7).toISOString().split('T')[0];
    } else if (currentView === 'week') {
      const ws = startOfWeek(currentDate, { locale: it });
      params.from = subDays(ws, 1).toISOString().split('T')[0];
      params.to = addDays(ws, 8).toISOString().split('T')[0];
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

  // Event dates for mini calendar dots
  const eventDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => set.add(format(e.start, 'yyyy-MM-dd')));
    return set;
  }, [events]);

  // ─── Style getters ──────────────────────────────────────────────────────
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const isWorkOrder = event.type === 'work_order';
      const color = isWorkOrder
        ? workOrderColor
        : bookingStatusColors[event.status] || '#8e8e93';
      return {
        style: {
          backgroundColor: color,
          borderRadius: '6px',
          opacity: 0.92,
          color: 'white',
          border: 'none',
          borderLeft: `3px solid ${color}`,
          fontSize: '11px',
          padding: '1px 4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          filter: isWorkOrder ? 'none' : 'none',
          outline: isWorkOrder ? `1px dashed rgba(255,255,255,0.5)` : 'none',
        },
      };
    },
    []
  );

  const dayPropGetter = useCallback(
    (date: Date) => {
      if (isToday(date)) {
        return {
          style: {
            backgroundColor: 'rgba(0, 122, 255, 0.04)',
          },
        };
      }
      return {};
    },
    []
  );

  const slotPropGetter = useCallback(
    (date: Date) => {
      const h = date.getHours();
      const isPast = date < now;
      if (isPast) {
        return {
          style: {
            backgroundColor: 'rgba(0,0,0,0.015)',
          },
        };
      }
      if (h >= 12 && h < 14) {
        return {
          style: {
            backgroundColor: 'rgba(255, 149, 0, 0.03)',
          },
        };
      }
      return {};
    },
    [now]
  );

  // ─── Handlers ─────────────────────────────────────────────────────────
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

  const handleNavigate = useCallback((date: Date) => setCurrentDate(date), []);
  const handleViewChange = useCallback((view: View) => setCurrentView(view), []);

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
          body: JSON.stringify({ startTime: start.toISOString(), endTime: end.toISOString() }),
        });
        if (!res.ok) throw new Error('Errore');
        toast.success('Evento spostato');
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
          body: JSON.stringify({ startTime: start.toISOString(), endTime: end.toISOString() }),
        });
        if (!res.ok) throw new Error('Errore');
        toast.success('Durata aggiornata');
        mutateEvents();
      } catch {
        toast.error("Errore nel ridimensionamento dell'evento");
        mutateEvents();
      }
    },
    [mutateEvents]
  );

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  // ─── View label ───────────────────────────────────────────────────────
  const viewLabel = useMemo(() => {
    if (currentView === 'month') return format(currentDate, 'MMMM yyyy', { locale: it });
    if (currentView === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) {
        return `${format(ws, 'd')}–${format(we, 'd MMMM yyyy', { locale: it })}`;
      }
      return `${format(ws, 'd MMM', { locale: it })} – ${format(we, 'd MMM yyyy', { locale: it })}`;
    }
    if (currentView === 'day') return format(currentDate, "EEEE d MMMM yyyy", { locale: it });
    return format(currentDate, 'MMMM yyyy', { locale: it });
  }, [currentDate, currentView]);

  // ─── Upcoming events today ────────────────────────────────────────────
  const todayEvents = useMemo(() => {
    return events
      .filter(e => isToday(e.start))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5);
  }, [events]);

  // ─── Sidebar stats config ────────────────────────────────────────────
  const sidebarStats = [
    { label: 'Prenotazioni oggi', value: String(stats.todayBookings), icon: CalendarIcon, color: '#007aff' },
    { label: 'Tecnici disponibili', value: String(stats.availableTechnicians), icon: Users, color: '#34c759' },
    { label: 'Bay occupati', value: `${stats.occupiedBays}/${stats.totalBays}`, icon: Warehouse, color: '#ff9500' },
  ];

  // ─── View buttons ────────────────────────────────────────────────────
  const viewButtons: { view: View; label: string }[] = isMobile
    ? [{ view: 'day', label: 'Giorno' }, { view: 'agenda', label: 'Agenda' }]
    : [
        { view: 'month', label: 'Mese' },
        { view: 'week', label: 'Settimana' },
        { view: 'day', label: 'Giorno' },
        { view: 'agenda', label: 'Agenda' },
      ];

  return (
    <div className="min-h-screen">
      {/* ─── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-[var(--surface-primary)]/80 border-b border-[var(--border-default)]">
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: Nav + Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (currentView === 'month') setCurrentDate(subMonths(currentDate, 1));
                  else if (currentView === 'week') setCurrentDate(subDays(currentDate, 7));
                  else setCurrentDate(subDays(currentDate, 1));
                }}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Precedente"
              >
                <ChevronLeft className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={() => {
                  if (currentView === 'month') setCurrentDate(addMonths(currentDate, 1));
                  else if (currentView === 'week') setCurrentDate(addDays(currentDate, 7));
                  else setCurrentDate(addDays(currentDate, 1));
                }}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Successivo"
              >
                <ChevronRight className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
              </button>
            </div>

            <h1 className="text-[20px] sm:text-[22px] font-semibold text-[var(--text-primary)] capitalize tracking-tight">
              {viewLabel}
            </h1>

            <button
              onClick={goToday}
              className="ml-1 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Oggi
            </button>
          </div>

          {/* Right: View switcher + actions */}
          <div className="flex items-center gap-3">
            {/* Segmented Control */}
            <div className="flex p-[3px] bg-[var(--surface-secondary)] dark:bg-[var(--surface-tertiary)] rounded-lg">
              {viewButtons.map(vb => (
                <button
                  key={vb.view}
                  onClick={() => handleViewChange(vb.view)}
                  className={`
                    px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-200
                    ${currentView === vb.view
                      ? 'bg-white dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  {vb.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-[var(--border-default)]" />

            <button
              onClick={() => router.push('/dashboard/bookings')}
              className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Vista lista"
              title="Vista lista"
            >
              <List className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
            </button>

            <AppleButton
              icon={<Plus className="h-4 w-4" />}
              onClick={() => router.push('/dashboard/bookings/new')}
              className="h-[36px] text-[13px]"
            >
              {!isMobile && 'Nuova'}
            </AppleButton>
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <motion.aside
          className="hidden lg:block w-[260px] xl:w-[280px] flex-shrink-0 border-r border-[var(--border-default)] p-4 space-y-5 overflow-y-auto"
          style={{ height: 'calc(100vh - 65px)' }}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          {/* Mini Calendar */}
          <MiniCalendar
            currentDate={currentDate}
            onDateSelect={(date) => {
              setCurrentDate(date);
              if (currentView === 'month') setCurrentView('day');
            }}
            eventDates={eventDates}
          />

          <div className="h-px bg-[var(--border-default)]" />

          {/* Stats */}
          <div className="space-y-3">
            {sidebarStats.map(stat => (
              <div key={stat.label} className="flex items-center gap-3 px-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-[var(--text-primary)] leading-tight">
                    {isLoading ? '–' : stat.value}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-[var(--border-default)]" />

          {/* Upcoming today */}
          <div>
            <h3 className="text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
              Prossimi oggi
            </h3>
            {todayEvents.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)] italic">Nessun evento oggi</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map(ev => {
                  const color = ev.type === 'work_order'
                    ? workOrderColor
                    : bookingStatusColors[ev.status] || '#8e8e93';
                  return (
                    <button
                      key={ev.id}
                      onClick={() => handleSelectEvent(ev)}
                      className="w-full text-left group flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div
                        className="w-[3px] rounded-full flex-shrink-0 mt-[2px]"
                        style={{ backgroundColor: color, height: '32px' }}
                      />
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                          {ev.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                          {format(ev.start, 'HH:mm')} – {format(ev.end, 'HH:mm')}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-[var(--border-default)]" />

          {/* Legend */}
          <div>
            <h3 className="text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
              Legenda
            </h3>
            <div className="space-y-[6px]">
              {Object.entries(bookingStatusLabels)
                .filter(([key]) => key !== 'in-progress')
                .map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="w-[8px] h-[8px] rounded-[2px]"
                      style={{ backgroundColor: bookingStatusColors[key] }}
                    />
                    <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
                  </div>
                ))}
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-[8px] h-[8px] rounded-[2px] border border-dashed"
                  style={{ backgroundColor: workOrderColor, borderColor: 'rgba(255,159,10,0.5)' }}
                />
                <span className="text-[11px] text-[var(--text-secondary)]">Ordine di Lavoro</span>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Calendar Area */}
        <motion.main
          className="flex-1 min-w-0"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          ref={calendarRef}
        >
          {eventsError || statsError ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="h-12 w-12 text-[#ff3b30]/40 mb-4" />
              <p className="text-[15px] text-[var(--text-secondary)]">
                Impossibile caricare il calendario
              </p>
              <AppleButton variant="ghost" className="mt-4" onClick={() => mutateEvents()}>
                Riprova
              </AppleButton>
            </div>
          ) : eventsLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-[#007aff]" />
            </div>
          ) : (
            <div className="apple-calendar-container" style={{ height: 'calc(100vh - 65px)' }}>
              <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
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
                dayPropGetter={dayPropGetter}
                slotPropGetter={slotPropGetter}
                components={{
                  event: CalendarEventComponent,
                }}
                messages={messages}
                culture="it-IT"
                min={new Date(2024, 0, 1, 7, 0)}
                max={new Date(2024, 0, 1, 20, 0)}
                step={15}
                timeslots={4}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                draggableAccessor={() => true}
                resizable
                toolbar={false}
                popup
                popupOffset={{ x: 0, y: 5 }}
                showMultiDayTimes
              />
            </div>
          )}
        </motion.main>
      </div>

      {/* ─── Mobile Stats Bar ────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/90 dark:bg-[var(--surface-primary)]/90 backdrop-blur-xl border-t border-[var(--border-default)] px-4 py-2">
        <div className="flex items-center justify-around">
          {sidebarStats.map(stat => (
            <div key={stat.label} className="flex items-center gap-2">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <div>
                <p className="text-[14px] font-bold text-[var(--text-primary)] leading-tight">
                  {isLoading ? '–' : stat.value}
                </p>
                <p className="text-[9px] text-[var(--text-tertiary)] leading-tight">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Quick Add Dialog ────────────────────────────────────────────── */}
      <AnimatePresence>
        {quickAdd.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white dark:bg-[var(--surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Dialog header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                  Prenotazione Rapida
                </h3>
                <button
                  onClick={() => setQuickAdd(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="h-5 w-5 text-[var(--text-tertiary)]" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Time info */}
                {quickAdd.slotStart && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,122,255,0.06)] dark:bg-[rgba(0,122,255,0.1)]">
                    <Clock className="h-4 w-4 text-[#007aff] flex-shrink-0" />
                    <span className="text-[13px] text-[var(--text-primary)] font-medium">
                      {quickAdd.slotStart.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
                      alle {quickAdd.slotStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      {quickAdd.slotEnd && (
                        <> – {quickAdd.slotEnd.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </span>
                  </div>
                )}

                {/* Customer */}
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                    Cliente
                  </label>
                  {quickAdd.selectedCustomerId ? (
                    <div className="flex items-center justify-between p-3 bg-[rgba(0,122,255,0.06)] dark:bg-[rgba(0,122,255,0.1)] rounded-xl">
                      <span className="text-[14px] font-medium text-[var(--text-primary)]">
                        {quickAdd.selectedCustomerName}
                      </span>
                      <button
                        onClick={() => setQuickAdd(prev => ({
                          ...prev,
                          selectedCustomerId: '',
                          selectedCustomerName: '',
                          customerSearch: '',
                        }))}
                        className="p-1 rounded-full hover:bg-[var(--surface-hover)]"
                      >
                        <X className="h-4 w-4 text-[#007aff]" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                      <Input
                        placeholder="Cerca cliente..."
                        value={quickAdd.customerSearch}
                        onChange={e => setQuickAdd(prev => ({ ...prev, customerSearch: e.target.value }))}
                        className="pl-10 h-11 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-tertiary)] text-[var(--text-primary)]"
                      />
                      {searchResults && searchResults.length > 0 && quickAdd.customerSearch.length >= 2 && (
                        <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-[var(--surface-elevated)] rounded-xl shadow-lg border border-[var(--border-default)] max-h-40 overflow-y-auto">
                          {searchResults.map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => setQuickAdd(prev => ({
                                ...prev,
                                selectedCustomerId: customer.id,
                                selectedCustomerName: `${customer.firstName} ${customer.lastName}`,
                                customerSearch: '',
                              }))}
                              className="w-full text-left px-4 py-3 hover:bg-[var(--surface-hover)] transition-colors text-[13px] text-[var(--text-primary)] min-h-[44px]"
                            >
                              {customer.firstName} {customer.lastName}
                              {customer.phone && (
                                <span className="text-[var(--text-tertiary)] ml-2">{customer.phone}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Service */}
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                    Servizio
                  </label>
                  <select
                    value={quickAdd.service}
                    onChange={e => setQuickAdd(prev => ({ ...prev, service: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-tertiary)] text-[14px] text-[var(--text-primary)]"
                  >
                    <option value="">Seleziona servizio...</option>
                    {serviceOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <AppleButton
                    variant="secondary"
                    className="flex-1 min-h-[44px]"
                    onClick={() => setQuickAdd(prev => ({ ...prev, isOpen: false }))}
                  >
                    Annulla
                  </AppleButton>
                  <AppleButton
                    className="flex-1 min-h-[44px]"
                    onClick={handleQuickAddSubmit}
                    disabled={quickAdd.isSubmitting || !quickAdd.selectedCustomerId || !quickAdd.service}
                    loading={quickAdd.isSubmitting}
                  >
                    Crea
                  </AppleButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Apple Calendar CSS Override ──────────────────────────────────── */}
      <style jsx global>{`
        /* ═══ RESET ═══ */
        .apple-calendar-container .rbc-toolbar {
          display: none !important;
        }

        .apple-calendar-container {
          padding: 0 2px;
        }

        /* ═══ HEADER ═══ */
        .apple-calendar-container .rbc-header {
          padding: 10px 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          border-bottom: 1px solid var(--border-default);
          background: transparent;
        }

        .apple-calendar-container .rbc-header + .rbc-header {
          border-left: none;
        }

        /* ═══ TIME GUTTER ═══ */
        .apple-calendar-container .rbc-time-gutter .rbc-label,
        .apple-calendar-container .rbc-label {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-tertiary);
          padding: 0 8px;
          text-align: right;
        }

        .apple-calendar-container .rbc-time-header-gutter {
          min-width: 54px;
        }

        .apple-calendar-container .rbc-time-gutter {
          min-width: 54px;
        }

        /* ═══ GRID LINES ═══ */
        .apple-calendar-container .rbc-timeslot-group {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          min-height: 48px;
        }

        .apple-calendar-container .rbc-time-slot {
          border-top: none;
          min-height: 12px;
        }

        .apple-calendar-container .rbc-day-slot .rbc-time-slot {
          border-top: none;
        }

        /* Every hour line */
        .apple-calendar-container .rbc-timeslot-group:not(:first-child) {
          border-color: rgba(0, 0, 0, 0.06);
        }

        /* ═══ DAY COLUMNS ═══ */
        .apple-calendar-container .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid rgba(0, 0, 0, 0.06);
        }

        .apple-calendar-container .rbc-time-content > * + * > * {
          border-left: 1px solid rgba(0, 0, 0, 0.06);
        }

        /* ═══ TODAY ═══ */
        .apple-calendar-container .rbc-today {
          background-color: rgba(0, 122, 255, 0.03) !important;
        }

        .apple-calendar-container .rbc-now .rbc-button-link {
          color: #007aff;
          font-weight: 700;
        }

        /* ═══ CURRENT TIME INDICATOR ═══ */
        .apple-calendar-container .rbc-current-time-indicator {
          background-color: #ff3b30;
          height: 2px;
          z-index: 3;
        }

        .apple-calendar-container .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -5px;
          top: -4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ff3b30;
        }

        /* ═══ EVENTS ═══ */
        .apple-calendar-container .rbc-event {
          border: none !important;
          border-radius: 6px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06) !important;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
          padding: 2px 6px !important;
          font-size: 11px;
          line-height: 1.3;
          overflow: hidden;
        }

        .apple-calendar-container .rbc-event:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          transform: scale(1.01);
          z-index: 10;
        }

        .apple-calendar-container .rbc-event:focus {
          outline: 2px solid #007aff;
          outline-offset: 1px;
        }

        .apple-calendar-container .rbc-event-label {
          font-size: 10px;
          font-weight: 500;
          opacity: 0.9;
        }

        .apple-calendar-container .rbc-event-content {
          font-size: 11px;
          font-weight: 500;
        }

        .apple-calendar-container .rbc-event-overlaps {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
        }

        /* ═══ SELECTION ═══ */
        .apple-calendar-container .rbc-slot-selection {
          background: rgba(0, 122, 255, 0.12);
          border: 1px solid rgba(0, 122, 255, 0.3);
          border-radius: 6px;
        }

        .apple-calendar-container .rbc-slot-selecting {
          cursor: cell;
        }

        /* ═══ MONTH VIEW ═══ */
        .apple-calendar-container .rbc-month-view {
          border: none;
          border-radius: 0;
        }

        .apple-calendar-container .rbc-month-row {
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .apple-calendar-container .rbc-month-row + .rbc-month-row {
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .apple-calendar-container .rbc-date-cell {
          padding: 4px 8px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
        }

        .apple-calendar-container .rbc-date-cell.rbc-now {
          font-weight: 700;
        }

        .apple-calendar-container .rbc-date-cell.rbc-now .rbc-button-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #007aff;
          color: white;
        }

        .apple-calendar-container .rbc-off-range-bg {
          background: rgba(0, 0, 0, 0.02);
        }

        .apple-calendar-container .rbc-off-range a {
          color: var(--text-tertiary);
          opacity: 0.5;
        }

        .apple-calendar-container .rbc-row-segment {
          padding: 0 2px 1px;
        }

        .apple-calendar-container .rbc-show-more {
          font-size: 11px;
          font-weight: 600;
          color: #007aff;
          padding: 2px 4px;
          background: transparent;
        }

        /* ═══ WEEK / DAY VIEW ═══ */
        .apple-calendar-container .rbc-time-view {
          border: none;
          border-radius: 0;
        }

        .apple-calendar-container .rbc-time-header {
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .apple-calendar-container .rbc-time-header-content {
          border-left: none;
        }

        .apple-calendar-container .rbc-time-content {
          border-top: none;
        }

        .apple-calendar-container .rbc-allday-cell {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        /* ═══ AGENDA VIEW ═══ */
        .apple-calendar-container .rbc-agenda-view {
          border: none;
          padding: 0 16px;
        }

        .apple-calendar-container .rbc-agenda-view table {
          border: none;
        }

        .apple-calendar-container .rbc-agenda-table {
          border: none;
        }

        .apple-calendar-container .rbc-agenda-table thead th {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-tertiary);
          padding: 12px 8px;
          border-bottom: 1px solid var(--border-default);
        }

        .apple-calendar-container .rbc-agenda-table tbody td {
          padding: 10px 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          font-size: 13px;
          color: var(--text-primary);
        }

        .apple-calendar-container .rbc-agenda-date-cell {
          font-weight: 600;
          white-space: nowrap;
        }

        .apple-calendar-container .rbc-agenda-time-cell {
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .apple-calendar-container .rbc-agenda-event-cell {
          font-weight: 500;
        }

        /* ═══ DRAG & DROP ═══ */
        .apple-calendar-container .rbc-addons-dnd-resize-ns-icon {
          width: 16px;
          height: 4px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 2px;
          margin: 0 auto;
        }

        .apple-calendar-container .rbc-addons-dnd-drag-preview {
          opacity: 0.7;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
        }

        /* ═══ POPUP / OVERLAY ═══ */
        .apple-calendar-container .rbc-overlay {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          padding: 8px;
          max-width: 240px;
          z-index: 20;
        }

        .apple-calendar-container .rbc-overlay-header {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          padding: 6px 8px 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          margin-bottom: 4px;
        }

        /* ═══ DARK MODE ═══ */
        :global(.dark) .apple-calendar-container .rbc-header {
          color: var(--text-tertiary);
          border-color: var(--border-default);
        }

        :global(.dark) .apple-calendar-container .rbc-timeslot-group {
          border-color: rgba(255, 255, 255, 0.06);
        }

        :global(.dark) .apple-calendar-container .rbc-day-bg + .rbc-day-bg {
          border-color: rgba(255, 255, 255, 0.06);
        }

        :global(.dark) .apple-calendar-container .rbc-time-content > * + * > * {
          border-color: rgba(255, 255, 255, 0.06);
        }

        :global(.dark) .apple-calendar-container .rbc-today {
          background-color: rgba(0, 122, 255, 0.06) !important;
        }

        :global(.dark) .apple-calendar-container .rbc-off-range-bg {
          background: rgba(255, 255, 255, 0.02);
        }

        :global(.dark) .apple-calendar-container .rbc-month-row,
        :global(.dark) .apple-calendar-container .rbc-month-row + .rbc-month-row {
          border-color: rgba(255, 255, 255, 0.06);
        }

        :global(.dark) .apple-calendar-container .rbc-time-header {
          border-color: rgba(255, 255, 255, 0.08);
        }

        :global(.dark) .apple-calendar-container .rbc-allday-cell {
          border-color: rgba(255, 255, 255, 0.06);
        }

        :global(.dark) .apple-calendar-container .rbc-date-cell {
          color: var(--text-primary);
        }

        :global(.dark) .apple-calendar-container .rbc-label {
          color: var(--text-tertiary);
        }

        :global(.dark) .apple-calendar-container .rbc-overlay {
          background: var(--surface-elevated);
          border-color: var(--border-default);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }

        :global(.dark) .apple-calendar-container .rbc-overlay-header {
          color: var(--text-primary);
          border-color: var(--border-default);
        }

        :global(.dark) .apple-calendar-container .rbc-agenda-table thead th {
          color: var(--text-tertiary);
          border-color: var(--border-default);
        }

        :global(.dark) .apple-calendar-container .rbc-agenda-table tbody td {
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.04);
        }

        :global(.dark) .apple-calendar-container .rbc-agenda-time-cell {
          color: var(--text-secondary);
        }

        /* ═══ SCROLLBAR ═══ */
        .apple-calendar-container .rbc-time-content::-webkit-scrollbar {
          width: 6px;
        }

        .apple-calendar-container .rbc-time-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .apple-calendar-container .rbc-time-content::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 3px;
        }

        :global(.dark) .apple-calendar-container .rbc-time-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
        }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 767px) {
          .apple-calendar-container {
            padding: 0;
            padding-bottom: 60px;
          }

          .apple-calendar-container .rbc-time-gutter .rbc-label,
          .apple-calendar-container .rbc-label {
            font-size: 9px;
            padding: 0 4px;
          }

          .apple-calendar-container .rbc-time-header-gutter,
          .apple-calendar-container .rbc-time-gutter {
            min-width: 40px;
          }

          .apple-calendar-container .rbc-event {
            font-size: 10px !important;
            padding: 1px 3px !important;
          }
        }

        /* ═══ PRINT ═══ */
        @media print {
          .apple-calendar-container .rbc-event {
            box-shadow: none !important;
            border: 1px solid rgba(0, 0, 0, 0.2) !important;
          }
        }

        /* ═══ ANIMATION ═══ */
        .apple-calendar-container .rbc-event {
          animation: eventFadeIn 0.2s ease-out;
        }

        @keyframes eventFadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
