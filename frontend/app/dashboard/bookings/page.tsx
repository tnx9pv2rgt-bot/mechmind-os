'use client';

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Search,
  Plus,
  Car,
  Wrench,
  ChevronRight,
  AlertCircle,
  CalendarDays,
  List,
  Columns3,
  Phone,
  MessageCircle,
  CheckCircle2,
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Timer,
  Users,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CalendarClock,
  UserX,
  PlayCircle,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { Pagination } from '@/components/ui/pagination';
import { useBookings, useBookingStats, useUpdateBooking } from '@/hooks/useApi';
import { KanbanBoard } from '@/components/bookings/kanban/kanban-board';
import type { KanbanColumnData } from '@/components/bookings/kanban/kanban-column';
import type { BookingCardData } from '@/components/bookings/kanban/kanban-card';
import { toast } from 'sonner';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Input } from '@/components/ui/input';

// =============================================================================
// Design Tokens (removed — now using Tailwind + CSS custom properties)
// =============================================================================

// =============================================================================
// Animations
// =============================================================================
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

// =============================================================================
// Helpers
// =============================================================================
function normalizeStatus(status: string): string {
  return status.toLowerCase().replace(/-/g, '_');
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'In attesa', color: '#fbbf24', icon: Clock },
  confirmed: { label: 'Confermato', color: '#60a5fa', icon: CheckCircle2 },
  in_progress: { label: 'In corso', color: '#10b981', icon: PlayCircle },
  completed: { label: 'Completato', color: '#a78bfa', icon: CheckCircle2 },
  cancelled: { label: 'Annullato', color: '#f87171', icon: X },
  no_show: { label: 'Non presentato', color: '#666666', icon: UserX },
};

function getStatusConfig(status: string): { label: string; color: string; icon: React.ComponentType<{ className?: string }> } {
  return statusConfig[normalizeStatus(status)] ?? { label: status, color: '#666666', icon: Clock };
}

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || value === 0) return '\u2014';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT');
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 0) {
    const absDiff = Math.abs(diffMin);
    if (absDiff < 60) return `${absDiff} min fa`;
    return `${Math.floor(absDiff / 60)}h ${absDiff % 60}min fa`;
  }
  if (diffMin === 0) return 'adesso';
  if (diffMin < 60) return `tra ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `tra ${h}h ${m}min` : `tra ${h}h`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

type QuickFilter = 'all' | 'today' | 'week' | 'pending';
type ViewMode = 'list' | 'kanban' | 'timeline' | 'agenda';

function getDateRange(filter: QuickFilter): { fromDate?: string; toDate?: string; date?: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  switch (filter) {
    case 'today':
      return { fromDate: today, toDate: today, date: today };
    case 'week': {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      return { fromDate: today, toDate: endOfWeek.toISOString().split('T')[0] };
    }
    default:
      return {};
  }
}

/** Extended booking fields that may come from the API beyond the base Booking type */
interface BookingExtra {
  estimatedDuration?: number;
  technicianName?: string;
  liftPosition?: string;
}

type ExtendedBooking = {
  id: string;
  customerName: string;
  customerPhone?: string;
  vehiclePlate: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  serviceCategory: string;
  serviceName?: string;
  status: string;
  scheduledAt: string;
  estimatedCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
} & BookingExtra;

const KANBAN_COLUMNS: { id: string; title: string; color: string }[] = [
  { id: 'pending', title: 'In Attesa', color: 'bg-amber-500' },
  { id: 'confirmed', title: 'Confermata', color: 'bg-green-500' },
  { id: 'in_progress', title: 'In Corso', color: 'bg-blue-500' },
  { id: 'completed', title: 'Completata', color: 'bg-purple-500' },
  { id: 'cancelled', title: 'Annullata', color: 'bg-red-500' },
  { id: 'no_show', title: 'Non Presentato', color: 'bg-gray-400' },
];

const BUSINESS_HOURS = { start: 7, end: 19 };
const TIMELINE_BAYS = ['Ponte 1', 'Ponte 2', 'Ponte 3', 'Ponte 4', 'Esterno'];

// =============================================================================
// KPI Sparkline
// =============================================================================
const Sparkline = memo(function Sparkline({ data, color, height = 24 }: { data: number[]; color: string; height?: number }): React.JSX.Element {
  if (data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={height} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
});

// =============================================================================
// KPI Card (Apple-style)
// =============================================================================
const KPI_COLOR_MAP: Record<string, string> = {
  '#60a5fa': 'bg-apple-blue',
  '#34d399': 'bg-apple-green',
  '#fbbf24': 'bg-apple-orange',
  '#a78bfa': 'bg-apple-purple',
  '#f87171': 'bg-apple-red',
  '#10b981': 'bg-apple-green',
  '#b4b4b4': 'bg-apple-gray',
};

const KpiCard = memo(function KpiCard({
  label, value, suffix, icon: Icon, color, trend, sparkData,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: number;
  sparkData?: number[];
}): React.JSX.Element {
  const bgClass = KPI_COLOR_MAP[color] || 'bg-apple-blue';
  return (
    <AppleCard hover={false}>
      <AppleCardContent>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {sparkData && <Sparkline data={sparkData} color={color} />}
          {trend !== undefined && !sparkData && (
            <div className="flex items-center gap-1" style={{ color: trend >= 0 ? '#34d399' : '#f87171' }}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span className="text-[15px] font-medium">{trend > 0 ? '+' : ''}{trend}%</span>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]">
            {value}
          </p>
          {suffix && <span className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">{suffix}</span>}
        </div>
        <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)]">{label}</p>
      </AppleCardContent>
    </AppleCard>
  );
});

// =============================================================================
// Booking Drawer (Slide-in Detail)
// =============================================================================
function BookingDrawer({
  booking,
  open,
  onClose,
  onStatusChange,
}: {
  booking: ExtendedBooking | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}): React.JSX.Element | null {
  if (!booking) return null;

  const sc = getStatusConfig(booking.status);
  const StatusIcon = sc.icon;
  const normalized = normalizeStatus(booking.status);

  const statusSteps = [
    { key: 'pending', label: 'Prenotato' },
    { key: 'confirmed', label: 'Confermato' },
    { key: 'in_progress', label: 'In Lavorazione' },
    { key: 'completed', label: 'Completato' },
  ];

  const stepOrder = ['pending', 'confirmed', 'in_progress', 'completed'];
  const currentIdx = stepOrder.indexOf(normalized);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 overflow-y-auto border-l bg-[var(--surface-tertiary)] border-[var(--border-default)]"
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-[var(--border-default)] backdrop-blur-xl bg-[var(--surface-tertiary)]/[0.93] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-footnote font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${sc.color}20`, color: sc.color }}>
                  <StatusIcon className="h-3 w-3 inline mr-1" />
                  {sc.label}
                </span>
                <span className="text-[16px] text-[var(--text-tertiary)]">
                  #{booking.id.slice(0, 8)}
                </span>
              </div>
              <AppleButton variant="ghost" size="sm" onClick={onClose}
                className="w-8 h-8 rounded-lg"
                aria-label="Chiudi">
                <X className="h-4 w-4 text-[var(--text-tertiary)]" />
              </AppleButton>
            </div>

            <div className="p-4 space-y-5">
              {/* Customer */}
              <div className="rounded-xl border border-[var(--border-default)] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] font-semibold bg-[#60a5fa20] text-[#60a5fa]">
                    {booking.customerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[var(--text-primary)]">{booking.customerName}</p>
                    {booking.customerPhone && (
                      <a href={`tel:${booking.customerPhone}`} className="text-[16px] hover:underline text-[#60a5fa]">
                        {booking.customerPhone}
                      </a>
                    )}
                  </div>
                </div>
                {booking.customerPhone && (
                  <div className="flex gap-2">
                    <a href={`tel:${booking.customerPhone}`}
                      className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[16px] font-medium border border-[var(--border-default)] text-[#60a5fa] transition-colors hover:bg-white/5">
                      <Phone className="h-3.5 w-3.5" /> Chiama
                    </a>
                    <a href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[16px] font-medium border border-[var(--border-default)] text-[#34d399] transition-colors hover:bg-white/5">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </div>
                )}
              </div>

              {/* Vehicle */}
              <div className="rounded-xl border border-[var(--border-default)] p-4">
                <h3 className="text-footnote font-semibold mb-3 text-[var(--text-tertiary)]">Veicolo</h3>
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-[#666666]" />
                  <div>
                    <p className="text-[18px] font-medium text-[var(--text-primary)]">
                      {booking.vehiclePlate}
                    </p>
                    <p className="text-[16px] text-[var(--text-tertiary)]">
                      {booking.vehicleBrand} {booking.vehicleModel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service details */}
              <div className="rounded-xl border border-[var(--border-default)] p-4">
                <h3 className="text-footnote font-semibold mb-3 text-[var(--text-tertiary)]">Servizio</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-[#666666]" />
                      <span className="text-[18px] text-[var(--text-primary)]">
                        {booking.serviceName || booking.serviceCategory}
                      </span>
                    </div>
                    {booking.estimatedCost !== undefined && (
                      <span className="text-[18px] font-medium text-[var(--text-primary)]">
                        {formatCurrency(booking.estimatedCost)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[16px] text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(booking.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(booking.scheduledAt)}
                    </span>
                    {booking.estimatedDuration && (
                      <span className="flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" />
                        {booking.estimatedDuration} min
                      </span>
                    )}
                  </div>
                  {booking.technicianName && (
                    <div className="flex items-center gap-2 text-[16px] text-[var(--text-tertiary)]">
                      <Users className="h-3.5 w-3.5" />
                      {booking.technicianName}
                    </div>
                  )}
                </div>
              </div>

              {/* Status timeline */}
              <div className="rounded-xl border border-[var(--border-default)] p-4">
                <h3 className="text-footnote font-semibold mb-4 text-[var(--text-tertiary)]">Stato</h3>
                <div className="flex items-center gap-1">
                  {statusSteps.map((step, i) => {
                    const isActive = stepOrder.indexOf(step.key) <= currentIdx;
                    const isCurrent = step.key === normalized;
                    return (
                      <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full h-1.5 rounded-full" style={{
                          backgroundColor: isActive
                            ? (normalized === 'cancelled' || normalized === 'no_show' ? '#f87171' : '#34d399')
                            : 'var(--border-default)',
                        }} />
                        <span className={`text-[9px] font-medium text-center ${isCurrent ? 'text-[var(--text-primary)]' : 'text-[#666666]'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div className="rounded-xl border border-[var(--border-default)] p-4">
                  <h3 className="text-footnote font-semibold mb-2 text-[var(--text-tertiary)]">Note</h3>
                  <p className="text-[17px] text-[var(--text-secondary)]">{booking.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {normalized === 'pending' && (
                  <AppleButton onClick={() => onStatusChange(booking.id, 'confirmed')}
                    fullWidth
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    className="h-11 rounded-xl text-[17px] bg-[#34d399] text-black hover:opacity-90">
                    Conferma Prenotazione
                  </AppleButton>
                )}
                {normalized === 'confirmed' && (
                  <AppleButton onClick={() => onStatusChange(booking.id, 'in_progress')}
                    fullWidth
                    icon={<PlayCircle className="h-4 w-4" />}
                    className="h-11 rounded-xl text-[17px] bg-[#60a5fa] text-white hover:opacity-90">
                    Inizia Lavoro
                  </AppleButton>
                )}
                {normalized === 'in_progress' && (
                  <AppleButton onClick={() => onStatusChange(booking.id, 'completed')}
                    fullWidth
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    className="h-11 rounded-xl text-[17px] bg-[#a78bfa] text-white hover:opacity-90">
                    Completa
                  </AppleButton>
                )}
                {(normalized === 'pending' || normalized === 'confirmed') && (
                  <>
                    <AppleButton variant="ghost" onClick={() => onStatusChange(booking.id, 'no_show')}
                      fullWidth
                      icon={<UserX className="h-4 w-4" />}
                      className="h-10 rounded-xl text-[17px]">
                      No-Show
                    </AppleButton>
                    <AppleButton variant="ghost" onClick={() => onStatusChange(booking.id, 'cancelled')}
                      fullWidth
                      icon={<X className="h-4 w-4" />}
                      className="h-10 rounded-xl text-[17px] border-[#f87171] text-[#f87171]">
                      Annulla
                    </AppleButton>
                  </>
                )}
                <Link href={`/dashboard/work-orders/new?bookingId=${booking.id}`}
                  className="w-full h-11 rounded-xl text-[17px] font-medium flex items-center justify-center gap-2 transition-colors hover:bg-white/10 bg-[var(--text-primary)] text-[var(--surface-tertiary)]">
                  <ClipboardList className="h-4 w-4" /> Crea Ordine di Lavoro
                </Link>
                <Link href={`/dashboard/bookings/${booking.id}`}
                  className="w-full h-10 rounded-xl text-[17px] font-medium flex items-center justify-center gap-2 border border-[var(--border-default)] text-[var(--text-secondary)] transition-colors hover:bg-white/5">
                  <Eye className="h-4 w-4" /> Vedi Dettaglio Completo
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Timeline View
// =============================================================================
function TimelineView({
  bookings,
  onBookingClick,
}: {
  bookings: ExtendedBooking[];
  onBookingClick: (b: ExtendedBooking) => void;
}): React.JSX.Element {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoveredBooking, setHoveredBooking] = useState<ExtendedBooking | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const totalHours = BUSINESS_HOURS.end - BUSINESS_HOURS.start;
  const slotWidth = 120; // px per hour
  const rowHeight = 64;
  const headerHeight = 40;

  // Generate hour labels
  const hours: number[] = [];
  for (let h = BUSINESS_HOURS.start; h <= BUSINESS_HOURS.end; h++) {
    hours.push(h);
  }

  // Assign bookings to bays
  const bayBookings = useMemo(() => {
    const map: Record<string, ExtendedBooking[]> = {};
    TIMELINE_BAYS.forEach(bay => { map[bay] = []; });

    const todayBookings = bookings
      .filter(b => isToday(b.scheduledAt) && normalizeStatus(b.status) !== 'cancelled')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    todayBookings.forEach(booking => {
      const assigned = booking.liftPosition || null;
      if (assigned && map[assigned]) {
        map[assigned].push(booking);
      } else {
        // Auto-assign to least loaded bay
        let minBay = TIMELINE_BAYS[0];
        let minCount = Infinity;
        for (const bay of TIMELINE_BAYS) {
          if (map[bay].length < minCount) {
            minCount = map[bay].length;
            minBay = bay;
          }
        }
        map[minBay].push(booking);
      }
    });

    return map;
  }, [bookings]);

  // Current time marker position
  const currentTimePosition = currentHour >= BUSINESS_HOURS.start && currentHour <= BUSINESS_HOURS.end
    ? (currentHour - BUSINESS_HOURS.start) * slotWidth
    : -1;

  // Auto-scroll to current time
  useEffect(() => {
    if (timelineRef.current && currentTimePosition > 0) {
      timelineRef.current.scrollLeft = Math.max(0, currentTimePosition - 200);
    }
  }, [currentTimePosition]);

  function getBookingPosition(booking: ExtendedBooking): { left: number; width: number } {
    const start = new Date(booking.scheduledAt);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (booking.estimatedDuration || 60) / 60;
    const left = Math.max(0, (startHour - BUSINESS_HOURS.start)) * slotWidth;
    const width = Math.max(slotWidth * 0.4, duration * slotWidth);
    return { left, width };
  }

  function getBookingColor(status: string): { bg: string; border: string; text: string } {
    const n = normalizeStatus(status);
    switch (n) {
      case 'pending': return { bg: 'rgba(251,191,36,0.15)', border: '#fbbf24', text: '#fbbf24' };
      case 'confirmed': return { bg: 'rgba(96,165,250,0.15)', border: '#60a5fa', text: '#60a5fa' };
      case 'in_progress': return { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#10b981' };
      case 'completed': return { bg: 'rgba(167,139,250,0.15)', border: '#a78bfa', text: '#a78bfa' };
      default: return { bg: 'rgba(136,136,136,0.15)', border: '#666666', text: '#666666' };
    }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent, booking: ExtendedBooking) => {
    setHoveredBooking(booking);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div className="rounded-2xl border overflow-hidden bg-[var(--surface-elevated)] border-[var(--border-default)]">
      {/* Timeline header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[var(--text-tertiary)]" />
          <h3 className="text-[18px] font-medium text-[var(--text-primary)]">
            {formatFullDate(new Date().toISOString()).replace(/^\w/, c => c.toUpperCase())}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries({ pending: 'In attesa', confirmed: 'Confermato', in_progress: 'In corso', completed: 'Completato' }).map(([key, label]) => {
            const c = getBookingColor(key);
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.border }} />
                <span className="text-[18px] text-[var(--text-tertiary)]">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline body */}
      <div ref={timelineRef} className="overflow-x-auto overflow-y-hidden" style={{ scrollBehavior: 'smooth' }}>
        <div style={{ minWidth: totalHours * slotWidth + 140, position: 'relative' }}>
          {/* Hour headers */}
          <div className="flex sticky top-0 z-10 bg-[var(--surface-elevated)]">
            <div className="shrink-0 w-[120px] border-r border-b border-[var(--border-default)] px-3 flex items-center"
              style={{ height: headerHeight }}>
              <span className="text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)]">Risorsa</span>
            </div>
            {hours.map(h => (
              <div key={h} className="border-r border-b border-[var(--border-default)] flex items-end pb-1 px-2"
                style={{ width: slotWidth, height: headerHeight }}>
                <span className="text-[18px] font-medium text-[#666666]">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Bay rows */}
          {TIMELINE_BAYS.map(bay => (
            <div key={bay} className="flex relative" style={{ height: rowHeight }}>
              <div className="shrink-0 w-[120px] border-r border-b border-[var(--border-default)] px-3 flex items-center">
                <span className="text-[16px] font-medium text-[var(--text-secondary)]">{bay}</span>
              </div>
              <div className="relative flex-1 border-b border-[var(--border-default)]">
                {/* Hour grid lines */}
                {hours.map(h => (
                  <div key={h} className="absolute top-0 bottom-0 border-r border-[var(--border-default)] opacity-50"
                    style={{ left: (h - BUSINESS_HOURS.start) * slotWidth }} />
                ))}
                {/* Half-hour grid lines */}
                {hours.slice(0, -1).map(h => (
                  <div key={`${h}-30`} className="absolute top-0 bottom-0 border-r border-dashed border-[var(--border-default)] opacity-25"
                    style={{ left: (h - BUSINESS_HOURS.start) * slotWidth + slotWidth / 2 }} />
                ))}

                {/* Booking blocks */}
                {(bayBookings[bay] || []).map(booking => {
                  const pos = getBookingPosition(booking);
                  const bColor = getBookingColor(booking.status);
                  const isCancelled = normalizeStatus(booking.status) === 'cancelled';
                  return (
                    <AppleButton
                      key={booking.id}
                      variant="ghost"
                      onClick={() => onBookingClick(booking)}
                      onMouseMove={(e) => handleMouseMove(e, booking)}
                      onMouseLeave={() => setHoveredBooking(null)}
                      className="absolute top-2 bottom-2 rounded-lg border-l-[3px] px-2 flex items-center gap-2 overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-white/20 hover:scale-[1.01] active:scale-[0.99] border-0 min-h-0 p-0"
                      style={{
                        left: pos.left,
                        width: pos.width,
                        backgroundColor: bColor.bg,
                        borderLeftColor: bColor.border,
                        textDecoration: isCancelled ? 'line-through' : 'none',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium truncate" style={{ color: bColor.text }}>
                          {booking.serviceName || booking.serviceCategory}
                        </p>
                        <p className="text-[9px] truncate text-[var(--text-tertiary)]">
                          {booking.customerName}
                        </p>
                      </div>
                    </AppleButton>
                  );
                })}
              </div>

              {/* Current time marker */}
              {currentTimePosition > 0 && (
                <div className="absolute top-0 bottom-0 w-[2px] z-20 pointer-events-none bg-[#f87171]"
                  style={{ left: currentTimePosition + 120 }}>
                  <div className="w-2 h-2 rounded-full -ml-[3px] -mt-1 bg-[#f87171]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredBooking && (
        <div
          className="fixed z-50 pointer-events-none rounded-xl border border-[var(--border-default)] bg-[var(--surface-tertiary)] p-3 shadow-xl"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 80,
            maxWidth: 260,
          }}
        >
          <p className="text-[17px] font-medium mb-1 text-[var(--text-primary)]">{hoveredBooking.customerName}</p>
          <p className="text-[15px] mb-1 text-[var(--text-tertiary)]">
            {hoveredBooking.vehiclePlate} {hoveredBooking.vehicleBrand} {hoveredBooking.vehicleModel}
          </p>
          <p className="text-[15px] mb-1 text-[var(--text-secondary)]">
            {hoveredBooking.serviceName || hoveredBooking.serviceCategory}
          </p>
          <div className="flex items-center gap-3 text-[18px] text-[var(--text-tertiary)]">
            <span>{formatTime(hoveredBooking.scheduledAt)}</span>
            {hoveredBooking.estimatedDuration && <span>{hoveredBooking.estimatedDuration} min</span>}
            <span>{formatCurrency(hoveredBooking.estimatedCost)}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {Object.values(bayBookings).every(arr => arr.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12">
          <CalendarClock className="h-12 w-12 mb-3 text-[var(--border-default)]" />
          <p className="text-[18px] font-medium mb-1 text-[var(--text-primary)]">Nessuna prenotazione oggi</p>
          <p className="text-[16px] text-[var(--text-tertiary)]">La timeline si popolerà automaticamente</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Agenda View (Reception Desk Mode)
// =============================================================================
function AgendaView({
  bookings,
  onBookingClick,
  onStatusChange,
}: {
  bookings: ExtendedBooking[];
  onBookingClick: (b: ExtendedBooking) => void;
  onStatusChange: (id: string, status: string) => void;
}): React.JSX.Element {
  const [showCompleted, setShowCompleted] = useState(false);
  const now = new Date();

  const todayBookings = useMemo(() => {
    return bookings
      .filter(b => isToday(b.scheduledAt))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [bookings]);

  const inProgress = todayBookings.filter(b => normalizeStatus(b.status) === 'in_progress');
  const upcoming = todayBookings.filter(b => {
    const s = normalizeStatus(b.status);
    return (s === 'pending' || s === 'confirmed') && new Date(b.scheduledAt).getTime() >= now.getTime() - 30 * 60000;
  });
  const completedToday = todayBookings.filter(b => normalizeStatus(b.status) === 'completed');

  function AgendaCard({ booking, showCountdown }: { booking: ExtendedBooking; showCountdown?: boolean }): React.JSX.Element {
    const sc = getStatusConfig(booking.status);
    const StatusIcon = sc.icon;

    return (
      <div
        className="rounded-xl border border-[var(--border-default)] p-3 cursor-pointer transition-all hover:ring-1 hover:ring-white/10 active:scale-[0.99]"
        onClick={() => onBookingClick(booking)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onBookingClick(booking); }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="text-center shrink-0 w-12">
              <p className="text-[18px] font-light text-[var(--text-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(booking.scheduledAt)}
              </p>
              {showCountdown && (
                <p className="text-[9px] font-medium text-[#60a5fa]">
                  {formatRelativeTime(booking.scheduledAt)}
                </p>
              )}
            </div>
            <div className="w-px h-10 shrink-0" style={{ backgroundColor: sc.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[18px] font-medium truncate text-[var(--text-primary)]">{booking.customerName}</p>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: `${sc.color}20`, color: sc.color }}>
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[15px] text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" /> {booking.vehiclePlate}
                  {booking.vehicleBrand && ` ${booking.vehicleBrand}`}
                </span>
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> {booking.serviceName || booking.serviceCategory}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {normalizeStatus(booking.status) === 'pending' && (
              <AppleButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onStatusChange(booking.id, 'confirmed'); }}
                className="w-8 h-8 rounded-lg min-h-0 p-0 border-0"
                title="Conferma" aria-label="Conferma prenotazione">
                <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
              </AppleButton>
            )}
            {normalizeStatus(booking.status) === 'confirmed' && (
              <AppleButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onStatusChange(booking.id, 'in_progress'); }}
                className="w-8 h-8 rounded-lg min-h-0 p-0 border-0"
                title="Check-in" aria-label="Check-in">
                <PlayCircle className="h-4 w-4 text-[#60a5fa]" />
              </AppleButton>
            )}
            {booking.customerPhone && (
              <>
                <a href={`tel:${booking.customerPhone}`} onClick={e => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                  title="Chiama" aria-label="Chiama cliente">
                  <Phone className="h-3.5 w-3.5 text-[#60a5fa]" />
                </a>
                <a href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                  title="WhatsApp" aria-label="WhatsApp">
                  <MessageCircle className="h-3.5 w-3.5 text-[#34d399]" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Progress bar for in_progress */}
        {normalizeStatus(booking.status) === 'in_progress' && booking.estimatedDuration && (
          <div className="mt-2 ml-[72px]">
            <div className="h-1.5 rounded-full overflow-hidden bg-[var(--border-default)]">
              <motion.div
                className="h-full rounded-full bg-[#10b981]"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, ((now.getTime() - new Date(booking.updatedAt).getTime()) / (booking.estimatedDuration * 60000)) * 100)}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current time */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4 text-center">
        <p className="text-[36px] font-light tracking-tight text-[var(--text-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-[17px] text-[var(--text-tertiary)]">
          {formatFullDate(now.toISOString()).replace(/^\w/, c => c.toUpperCase())}
        </p>
      </div>

      {/* In corso */}
      {inProgress.length > 0 && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse bg-[#10b981]" />
            <h3 className="text-footnote font-semibold text-apple-green">
              In corso adesso ({inProgress.length})
            </h3>
          </div>
          {inProgress.map(b => <AgendaCard key={b.id} booking={b} />)}
        </div>
      )}

      {/* Upcoming */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4 space-y-3">
        <h3 className="text-footnote font-semibold text-apple-blue">
          Prossimi ({upcoming.length})
        </h3>
        {upcoming.length > 0 ? (
          upcoming.map(b => <AgendaCard key={b.id} booking={b} showCountdown />)
        ) : (
          <p className="text-[17px] py-4 text-center text-[var(--text-tertiary)]">
            Nessuna prenotazione in arrivo per oggi
          </p>
        )}
      </div>

      {/* Completed */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4">
        <AppleButton
          variant="ghost"
          onClick={() => setShowCompleted(!showCompleted)}
          className="w-full flex items-center justify-between text-footnote font-semibold border-0 min-h-0 p-0 rounded-none"
        >
          <span>Completati oggi ({completedToday.length})</span>
          {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </AppleButton>
        <AnimatePresence>
          {showCompleted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3 mt-3"
            >
              {completedToday.length > 0 ? (
                completedToday.map(b => <AgendaCard key={b.id} booking={b} />)
              ) : (
                <p className="text-[17px] py-2 text-center text-[var(--text-tertiary)]">
                  Nessun lavoro completato oggi
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================
function EmptyState({ hasFilters }: { hasFilters: boolean }): React.JSX.Element {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-12 w-12 text-apple-gray/40 mb-4" />
        <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
          Nessun risultato. Prova a modificare i filtri di ricerca.
        </p>
        <AppleButton
          variant="ghost"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Resetta filtri
        </AppleButton>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Calendar className="h-12 w-12 text-apple-gray/40 mb-4" />
      <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
        Nessuna prenotazione. Crea la prima prenotazione.
      </p>
      <Link href="/dashboard/bookings/new">
        <AppleButton
          variant="ghost"
          className="mt-4"
        >
          Crea la prima prenotazione
        </AppleButton>
      </Link>
    </div>
  );
}

// =============================================================================
// Loading Skeletons
// =============================================================================
function ListSkeleton(): React.JSX.Element {
  return (
    <div className="divide-y divide-[var(--border-default)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-5 animate-pulse">
          <div className="w-1 h-12 rounded-full bg-[var(--border-default)]" />
          <div className="flex-1 space-y-2">
            <div className="w-40 h-4 rounded bg-[var(--border-default)]" />
            <div className="w-56 h-3 rounded bg-white/[0.06]" />
          </div>
          <div className="w-16 h-4 rounded bg-[var(--border-default)]" />
        </div>
      ))}
    </div>
  );
}

function TimelineSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4 animate-pulse">
      <div className="h-6 w-48 rounded mb-4 bg-[var(--border-default)]" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 mb-3">
          <div className="w-20 h-4 rounded bg-[var(--border-default)]" />
          <div className="flex-1 h-10 rounded-lg bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function KanbanSkeleton(): React.JSX.Element {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 rounded-2xl p-4 animate-pulse bg-white/[0.06]">
          <div className="h-4 w-24 rounded mb-4 bg-[var(--border-default)]" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-28 rounded-xl bg-[var(--surface-elevated)]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgendaSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4 h-24">
        <div className="h-10 w-24 rounded mx-auto mb-2 bg-[var(--border-default)]" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4">
          <div className="h-4 w-32 rounded mb-3 bg-[var(--border-default)]" />
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="h-16 rounded-xl mb-2 bg-white/[0.06]" />
          ))}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function BookingsPage(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('today');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<ExtendedBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [sortColumn, setSortColumn] = useState<string>('scheduledAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const PAGE_SIZE = viewMode === 'kanban' ? 200 : viewMode === 'timeline' || viewMode === 'agenda' ? 100 : 20;
  const updateBooking = useUpdateBooking();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, selectedDate, selectedStatus, quickFilter]);

  const dateRange = useMemo(() => getDateRange(quickFilter), [quickFilter]);
  const statusFilter = quickFilter === 'pending' ? 'pending' : selectedStatus;

  const {
    data: bookingsData,
    isLoading,
    error,
    refetch,
  } = useBookings({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    date: selectedDate || dateRange.date || undefined,
    status: statusFilter || undefined,
  });

  const { data: stats } = useBookingStats();
  const todayRange = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return { fromDate: today, toDate: today };
  }, []);
  const { data: todayStats } = useBookingStats(todayRange);

  const bookings = (bookingsData?.data ?? []) as unknown as ExtendedBooking[];
  const total = bookingsData?.total ?? 0;

  const todayCount = todayStats?.total ?? 0;
  const totalCount = stats?.total ?? 0;
  const pendingCount = stats?.byStatus?.PENDING ?? stats?.byStatus?.pending ?? 0;
  const confirmedCount = stats?.byStatus?.CONFIRMED ?? stats?.byStatus?.confirmed ?? 0;
  const inProgressCount = stats?.byStatus?.IN_PROGRESS ?? stats?.byStatus?.in_progress ?? 0;
  const completedCount = stats?.byStatus?.COMPLETED ?? stats?.byStatus?.completed ?? 0;
  const noShowCount = stats?.byStatus?.NO_SHOW ?? stats?.byStatus?.no_show ?? 0;

  // Computed KPIs
  const confirmRate = totalCount > 0 ? Math.round((confirmedCount + inProgressCount + completedCount) / totalCount * 100) : 0;
  const noShowRate = totalCount > 0 ? Math.round(noShowCount / totalCount * 100) : 0;
  const todayRevenue = useMemo(() => {
    return bookings.filter(b => isToday(b.scheduledAt)).reduce((sum, b) => sum + (b.estimatedCost || 0), 0);
  }, [bookings]);

  // Sort bookings for list view
  const sortedBookings = useMemo(() => {
    const sorted = [...bookings];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'scheduledAt':
          cmp = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
          break;
        case 'customerName':
          cmp = a.customerName.localeCompare(b.customerName);
          break;
        case 'vehiclePlate':
          cmp = a.vehiclePlate.localeCompare(b.vehiclePlate);
          break;
        case 'status':
          cmp = normalizeStatus(a.status).localeCompare(normalizeStatus(b.status));
          break;
        case 'estimatedCost':
          cmp = (a.estimatedCost || 0) - (b.estimatedCost || 0);
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [bookings, sortColumn, sortDir]);

  // Kanban columns
  const kanbanColumns = useMemo((): KanbanColumnData[] => {
    return KANBAN_COLUMNS.map(col => ({
      ...col,
      items: bookings
        .filter(b => normalizeStatus(b.status) === col.id)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .map(
          (b): BookingCardData => ({
            id: b.id,
            customerName: b.customerName,
            customerPhone: b.customerPhone,
            vehiclePlate: b.vehiclePlate,
            vehicleBrand: b.vehicleBrand,
            vehicleModel: b.vehicleModel,
            serviceName: b.serviceName || '',
            serviceCategory: b.serviceCategory,
            scheduledAt: b.scheduledAt,
            estimatedCost: b.estimatedCost,
            status: b.status,
          })
        ),
    }));
  }, [bookings]);

  // Handlers
  const handleStatusChange = useCallback(
    async (itemId: string, _fromStatus: string, toStatus: string) => {
      try {
        await updateBooking.mutateAsync({ id: itemId, status: toStatus });
        toast.success(`Stato aggiornato a "${getStatusConfig(toStatus).label}"`);
      } catch {
        toast.error('Errore nel cambio stato');
        refetch();
      }
    },
    [updateBooking, refetch]
  );

  const handleSingleStatusChange = useCallback(
    async (id: string, toStatus: string) => {
      try {
        await updateBooking.mutateAsync({ id, status: toStatus });
        toast.success(`Stato aggiornato a "${getStatusConfig(toStatus).label}"`);
        setDrawerOpen(false);
      } catch {
        toast.error('Errore nel cambio stato');
        refetch();
      }
    },
    [updateBooking, refetch]
  );

  const handleQuickFilter = (filter: QuickFilter): void => {
    setQuickFilter(filter);
    if (filter !== 'all') {
      setSelectedDate('');
      setSelectedStatus('');
    }
  };

  const openDrawer = (booking: ExtendedBooking): void => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  };

  const handleSort = (column: string): void => {
    if (sortColumn === column) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id: string): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (): void => {
    if (selectedIds.size === bookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookings.map(b => b.id)));
    }
  };

  const hasActiveFilters = debouncedSearch || selectedDate || selectedStatus;
  const activeFilterCount = [debouncedSearch, selectedDate, selectedStatus].filter(Boolean).length;

  // Today summary text
  const todaySummary = useMemo(() => {
    const parts: string[] = [];
    if (todayCount > 0) parts.push(`${todayCount} prenotazioni`);
    if (pendingCount > 0) parts.push(`${pendingCount} in attesa`);
    if (confirmedCount > 0) parts.push(`${confirmedCount} confermate`);
    if (inProgressCount > 0) parts.push(`${inProgressCount} in corso`);
    return parts.join(' | ') || 'Nessuna prenotazione';
  }, [todayCount, pendingCount, confirmedCount, inProgressCount]);

  // View mode icons/labels
  const viewModes: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { mode: 'list', icon: List, label: 'Lista' },
    { mode: 'kanban', icon: Columns3, label: 'Kanban' },
    { mode: 'timeline', icon: CalendarClock, label: 'Timeline' },
    { mode: 'agenda', icon: CalendarDays, label: 'Agenda' },
  ];

  // KPI cards data
  const kpiCards = [
    { label: 'Oggi', value: todayCount, icon: Calendar, color: '#60a5fa', trend: undefined },
    { label: 'Tasso Conferma', value: `${confirmRate}`, suffix: '%', icon: CheckCircle2, color: '#34d399', sparkData: [60, 65, 72, 68, 75, 80, confirmRate] },
    { label: 'In Attesa', value: pendingCount, icon: Clock, color: '#fbbf24', trend: undefined },
    { label: 'Revenue Oggi', value: formatCurrency(todayRevenue), icon: BarChart3, color: '#a78bfa', trend: undefined },
    { label: 'No-Show', value: `${noShowRate}`, suffix: '%', icon: UserX, color: '#f87171', trend: noShowRate > 5 ? noShowRate : -noShowRate },
    { label: 'In Corso', value: inProgressCount, icon: PlayCircle, color: '#10b981', trend: undefined },
    { label: 'Completate', value: completedCount, icon: CheckCircle2, color: '#a78bfa', trend: undefined },
    { label: 'Totale', value: totalCount, icon: CalendarDays, color: '#b4b4b4', sparkData: [totalCount * 0.6, totalCount * 0.7, totalCount * 0.8, totalCount * 0.85, totalCount * 0.9, totalCount * 0.95, totalCount] },
  ];

  return (
    <div>
      {/* ================================================================= */}
      {/* Header */}
      {/* ================================================================= */}
      <header>
        <div className="px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">Prenotazioni</h1>
            <p className="text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1">
              Oggi: {todaySummary}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="inline-flex rounded-xl p-1 bg-white/[0.06]">
              {viewModes.map(({ mode, icon: ModeIcon, label }) => (
                <AppleButton
                  key={mode}
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-[16px] min-h-[36px] border-0 ${viewMode === mode ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)]' : 'bg-transparent text-[#666666]'}`}
                  aria-label={`Vista ${label}`}
                  icon={<ModeIcon className="h-3.5 w-3.5" />}
                >
                  <span className="hidden sm:inline">{label}</span>
                </AppleButton>
              ))}
            </div>
            <Link href="/dashboard/calendar">
              <AppleButton variant="ghost" icon={<CalendarDays className="h-4 w-4" />}>
                <span className="hidden sm:inline">Calendario</span>
              </AppleButton>
            </Link>
            <Link href="/dashboard/bookings/new">
              <AppleButton icon={<Plus className="h-4 w-4" />}>
                Nuova Prenotazione
              </AppleButton>
            </Link>
          </div>
        </div>
      </header>

      <motion.div
        className="p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* ================================================================= */}
        {/* KPI Cards (2 rows of 4) */}
        {/* ================================================================= */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-bento">
          {kpiCards.map((kpi) => (
            <motion.div key={kpi.label} variants={statsCardVariants}>
              <KpiCard
                label={kpi.label}
                value={isLoading ? '\u2014' : kpi.value}
                suffix={kpi.suffix}
                icon={kpi.icon}
                color={kpi.color}
                trend={kpi.trend}
                sparkData={kpi.sparkData}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* ================================================================= */}
        {/* Quick Filters + Search */}
        {/* ================================================================= */}
        <motion.div variants={listItemVariants} initial="hidden" animate="visible">
          <AppleCard hover={false}>
            <AppleCardContent>
            {/* Quick filters */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { key: 'all' as const, label: 'Tutte' },
                  { key: 'today' as const, label: 'Oggi' },
                  { key: 'week' as const, label: 'Settimana' },
                  { key: 'pending' as const, label: 'In attesa' },
                ]).map(tab => (
                  <AppleButton
                    key={tab.key}
                    variant={quickFilter === tab.key ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleQuickFilter(tab.key)}
                    className={`h-8 px-3 rounded-lg text-[16px] min-h-0 ${quickFilter === tab.key ? 'bg-[var(--text-primary)] text-[var(--surface-tertiary)]' : ''}`}
                  >
                    {tab.label}
                  </AppleButton>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <AppleButton variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setSelectedDate(''); setSelectedStatus(''); }}
                    className="text-[15px] px-2 py-1 rounded-lg min-h-0 border-0 text-[#f87171]"
                    icon={<X className="h-3 w-3" />}>
                    Cancella filtri ({activeFilterCount})
                  </AppleButton>
                )}
                {viewMode === 'list' && (
                  <AppleButton variant="ghost" size="sm" onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}
                    className="w-8 h-8 rounded-lg min-h-0 p-0 border-0"
                    title={density === 'compact' ? 'Espandi righe' : 'Compatta righe'}
                    aria-label="Cambia densità">
                    {density === 'compact' ? <Eye className="h-3.5 w-3.5 text-[#666666]" /> : <EyeOff className="h-3.5 w-3.5 text-[#666666]" />}
                  </AppleButton>
                )}
              </div>
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray" />
                <Input
                  placeholder="Cerca per cliente, veicolo o servizio..."
                  aria-label="Cerca prenotazioni"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); if (e.target.value) setQuickFilter('all'); }}
                  aria-label="Filtra per data"
                  className="h-10 px-3 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue"
                />
                <select
                  value={selectedStatus}
                  onChange={e => { setSelectedStatus(e.target.value); if (e.target.value) setQuickFilter('all'); }}
                  aria-label="Filtra per stato"
                  className="h-10 px-3 rounded-md border border-apple-border dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer"
                >
                  <option value="">Tutti gli stati</option>
                  <option value="pending">In attesa</option>
                  <option value="confirmed">Confermato</option>
                  <option value="in_progress">In corso</option>
                  <option value="completed">Completato</option>
                  <option value="cancelled">Annullato</option>
                  <option value="no_show">Non presentato</option>
                </select>
              </div>
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-center gap-3">
                <span className="text-[16px] text-[var(--text-tertiary)]">
                  {selectedIds.size} selezionat{selectedIds.size === 1 ? 'o' : 'i'}
                </span>
                <AppleButton variant="ghost" size="sm" onClick={async () => {
                  for (const id of selectedIds) {
                    await updateBooking.mutateAsync({ id, status: 'confirmed' }).catch(() => null);
                  }
                  toast.success(`${selectedIds.size} prenotazioni confermate`);
                  setSelectedIds(new Set());
                  refetch();
                }}
                  className="h-7 px-3 rounded-lg text-[15px] min-h-0 bg-[#34d39920] text-[#34d399] border-0">
                  Conferma tutti
                </AppleButton>
                <AppleButton variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}
                  className="h-7 px-3 rounded-lg text-[15px] min-h-0 text-[#666666] border-0">
                  Deseleziona
                </AppleButton>
              </motion.div>
            )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* ================================================================= */}
        {/* Content */}
        {/* ================================================================= */}
        <motion.div variants={listItemVariants} initial="hidden" animate="visible">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* ---- KANBAN ---- */}
              {viewMode === 'kanban' && (
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                      Kanban Prenotazioni
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent>
                    {isLoading ? <KanbanSkeleton /> : error ? (
                      <ErrorState onRetry={refetch} />
                    ) : (
                      <KanbanBoard columns={kanbanColumns} onStatusChange={handleStatusChange} />
                    )}
                  </AppleCardContent>
                </AppleCard>
              )}

              {/* ---- TIMELINE ---- */}
              {viewMode === 'timeline' && (
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                      Timeline Giornaliera
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent>
                    {isLoading ? <TimelineSkeleton /> : error ? (
                      <ErrorState onRetry={refetch} />
                    ) : (
                      <TimelineView bookings={bookings} onBookingClick={openDrawer} />
                    )}
                  </AppleCardContent>
                </AppleCard>
              )}

              {/* ---- AGENDA ---- */}
              {viewMode === 'agenda' && (
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                      Agenda Reception
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent>
                    {isLoading ? <AgendaSkeleton /> : error ? (
                      <ErrorState onRetry={refetch} />
                    ) : (
                      <AgendaView
                        bookings={bookings}
                        onBookingClick={openDrawer}
                        onStatusChange={handleSingleStatusChange}
                      />
                    )}
                  </AppleCardContent>
                </AppleCard>
              )}

              {/* ---- LIST ---- */}
              {viewMode === 'list' && (
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                      Elenco Prenotazioni
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent>
                  {/* Table header */}
                  <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-medium border-b border-[var(--border-default)] text-apple-dark dark:text-[var(--text-primary)]">
                    <div className="col-span-1 flex items-center gap-2">
                      <input type="checkbox" checked={selectedIds.size === bookings.length && bookings.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border accent-white"
                        aria-label="Seleziona tutti" />
                      <SortHeader label="Ora" column="scheduledAt" current={sortColumn} dir={sortDir} onSort={handleSort} />
                    </div>
                    <div className="col-span-2">
                      <SortHeader label="Cliente" column="customerName" current={sortColumn} dir={sortDir} onSort={handleSort} />
                    </div>
                    <div className="col-span-2">
                      <SortHeader label="Veicolo" column="vehiclePlate" current={sortColumn} dir={sortDir} onSort={handleSort} />
                    </div>
                    <div className="col-span-2">Servizio</div>
                    <div className="col-span-1">Tecnico</div>
                    <div className="col-span-1">
                      <SortHeader label="Stato" column="status" current={sortColumn} dir={sortDir} onSort={handleSort} />
                    </div>
                    <div className="col-span-1">
                      <SortHeader label="Costo" column="estimatedCost" current={sortColumn} dir={sortDir} onSort={handleSort} />
                    </div>
                    <div className="col-span-2 text-right">Azioni</div>
                  </div>

                  <div className="divide-y divide-[var(--border-default)]">
                    {isLoading ? (
                      <ListSkeleton />
                    ) : error ? (
                      <ErrorState onRetry={refetch} />
                    ) : bookings.length === 0 ? (
                      <EmptyState hasFilters={!!hasActiveFilters || quickFilter !== 'all'} />
                    ) : (
                      <motion.div
                        className="space-y-3 p-2"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                      {sortedBookings.map((booking, index) => {
                        const sc = getStatusConfig(booking.status);
                        const isSelected = selectedIds.has(booking.id);
                        const padY = density === 'compact' ? 'py-2' : 'py-3.5';
                        return (
                          <motion.div
                            key={booking.id}
                            className={`group flex items-center gap-3 px-4 ${padY} rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300 cursor-pointer ${isSelected ? 'ring-1 ring-apple-blue' : ''}`}
                            variants={listItemVariants}
                            custom={index}
                            whileHover={{ scale: 1.005, x: 4 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => openDrawer(booking)}
                          >
                            {/* Checkbox */}
                            <input type="checkbox" checked={isSelected}
                              onChange={(e) => { e.stopPropagation(); toggleSelect(booking.id); }}
                              onClick={e => e.stopPropagation()}
                              className="w-3.5 h-3.5 rounded border accent-white shrink-0 hidden lg:block"
                              aria-label={`Seleziona ${booking.customerName}`} />

                            {/* Status bar */}
                            <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />

                            {/* Main info */}
                            <div className="flex-1 min-w-0 lg:grid lg:grid-cols-12 lg:gap-2 lg:items-center">
                              {/* Time */}
                              <div className="col-span-1 hidden lg:block">
                                <p className="text-[17px] font-medium text-[var(--text-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {formatTime(booking.scheduledAt)}
                                </p>
                                <p className="text-[18px] text-[var(--text-tertiary)]">{formatDate(booking.scheduledAt)}</p>
                              </div>

                              {/* Customer */}
                              <div className="col-span-2">
                                <p className="text-[17px] font-medium truncate text-[var(--text-primary)]">
                                  {booking.customerName}
                                </p>
                                {booking.customerPhone && (
                                  <p className="text-[18px] truncate text-[var(--text-tertiary)]">{booking.customerPhone}</p>
                                )}
                              </div>

                              {/* Vehicle */}
                              <div className="col-span-2 hidden lg:block">
                                <p className="text-[16px] font-mono text-[var(--text-primary)]">{booking.vehiclePlate}</p>
                                <p className="text-[18px] truncate text-[var(--text-tertiary)]">
                                  {booking.vehicleBrand} {booking.vehicleModel}
                                </p>
                              </div>

                              {/* Service */}
                              <div className="col-span-2 hidden lg:block">
                                <p className="text-[16px] truncate text-[var(--text-secondary)]">
                                  {booking.serviceName || booking.serviceCategory}
                                </p>
                                {booking.estimatedDuration && (
                                  <p className="text-[18px] text-[var(--text-tertiary)]">{booking.estimatedDuration} min</p>
                                )}
                              </div>

                              {/* Technician */}
                              <div className="col-span-1 hidden lg:block">
                                <p className="text-[15px] truncate text-[var(--text-tertiary)]">
                                  {booking.technicianName || '\u2014'}
                                </p>
                              </div>

                              {/* Status */}
                              <div className="col-span-1 hidden lg:block">
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full inline-block"
                                  style={{ backgroundColor: `${sc.color}20`, color: sc.color }}>
                                  {sc.label}
                                </span>
                              </div>

                              {/* Cost */}
                              <div className="col-span-1 hidden lg:block">
                                <p className="text-[17px] font-medium text-[var(--text-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {formatCurrency(booking.estimatedCost)}
                                </p>
                              </div>

                              {/* Mobile meta */}
                              <div className="flex items-center gap-3 text-[15px] mt-0.5 lg:hidden text-[var(--text-tertiary)]">
                                <span>{formatTime(booking.scheduledAt)}</span>
                                <span>{booking.vehiclePlate}</span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${sc.color}20`, color: sc.color }}>{sc.label}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity col-span-2 justify-end shrink-0">
                              {normalizeStatus(booking.status) === 'pending' && (
                                <AppleButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSingleStatusChange(booking.id, 'confirmed'); }}
                                  className="w-8 h-8 rounded-lg min-h-0 p-0 border-0"
                                  title="Conferma" aria-label="Conferma">
                                  <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
                                </AppleButton>
                              )}
                              {normalizeStatus(booking.status) === 'confirmed' && (
                                <AppleButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSingleStatusChange(booking.id, 'in_progress'); }}
                                  className="w-8 h-8 rounded-lg min-h-0 p-0 border-0"
                                  title="Check-in" aria-label="Check-in">
                                  <PlayCircle className="h-4 w-4 text-[#60a5fa]" />
                                </AppleButton>
                              )}
                              {booking.customerPhone && (
                                <>
                                  <a href={`tel:${booking.customerPhone}`} onClick={e => e.stopPropagation()}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                    title="Chiama" aria-label="Chiama">
                                    <Phone className="h-3.5 w-3.5 text-[#60a5fa]" />
                                  </a>
                                  <a href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                                    target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                    title="WhatsApp" aria-label="WhatsApp">
                                    <MessageCircle className="h-3.5 w-3.5 text-[#34d399]" />
                                  </a>
                                </>
                              )}
                              <Link href={`/dashboard/work-orders/new?bookingId=${booking.id}`} onClick={e => e.stopPropagation()}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                  title="Crea OdL" aria-label="Crea Ordine di Lavoro">
                                  <ClipboardList className="h-3.5 w-3.5 text-[#a78bfa]" />
                                </div>
                              </Link>
                            </div>

                            <ChevronRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 text-[var(--text-tertiary)]" />
                          </motion.div>
                        );
                      })}
                      </motion.div>
                    )}
                  </div>

                  {/* Pagination */}
                  {total > PAGE_SIZE && (
                    <div className="px-4 py-3 border-t border-[var(--border-default)]">
                      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
                    </div>
                  )}
                  </AppleCardContent>
                </AppleCard>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Booking Drawer */}
      <BookingDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleSingleStatusChange}
      />
    </div>
  );
}

// =============================================================================
// Sort Header
// =============================================================================
function SortHeader({
  label, column, current, dir, onSort,
}: {
  label: string;
  column: string;
  current: string;
  dir: 'asc' | 'desc';
  onSort: (col: string) => void;
}): React.JSX.Element {
  const isActive = current === column;
  return (
    <AppleButton
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className="flex items-center gap-0.5 min-h-0 p-0 border-0 rounded-none !text-apple-dark dark:!text-[var(--text-primary)] hover:opacity-70"
    >
      {label}
      {isActive && (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </AppleButton>
  );
}

// =============================================================================
// Error State
// =============================================================================
function ErrorState({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-apple-red/40 mb-4" />
      <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
        Impossibile caricare le prenotazioni
      </p>
      <AppleButton
        variant="ghost"
        className="mt-4"
        onClick={onRetry}
      >
        Riprova
      </AppleButton>
    </div>
  );
}
