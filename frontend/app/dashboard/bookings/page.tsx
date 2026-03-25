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
  ArrowLeft,
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
// Dialog import kept for potential future use
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// =============================================================================
// Design Tokens
// =============================================================================
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
  emerald: '#10b981',
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
};

// =============================================================================
// Animations
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// =============================================================================
// Helpers
// =============================================================================
function normalizeStatus(status: string): string {
  return status.toLowerCase().replace(/-/g, '_');
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'In attesa', color: colors.warning, icon: Clock },
  confirmed: { label: 'Confermato', color: colors.info, icon: CheckCircle2 },
  in_progress: { label: 'In corso', color: colors.emerald, icon: PlayCircle },
  completed: { label: 'Completato', color: colors.purple, icon: CheckCircle2 },
  cancelled: { label: 'Annullato', color: colors.error, icon: X },
  no_show: { label: 'Non presentato', color: colors.textMuted, icon: UserX },
};

function getStatusConfig(status: string): { label: string; color: string; icon: React.ComponentType<{ className?: string }> } {
  return statusConfig[normalizeStatus(status)] ?? { label: status, color: colors.textMuted, icon: Clock };
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
// KPI Card
// =============================================================================
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
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col justify-between min-h-[110px]"
      style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <span style={{ color }}><Icon className="h-4 w-4" /></span>
        </div>
        {sparkData && <Sparkline data={sparkData} color={color} />}
        {trend !== undefined && !sparkData && (
          <div className="flex items-center gap-1" style={{ color: trend >= 0 ? colors.success : colors.error }}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="text-[11px] font-medium">{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: colors.textTertiary }}>{label}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-[24px] font-light tracking-tight" style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </p>
          {suffix && <span className="text-[12px]" style={{ color: colors.textTertiary }}>{suffix}</span>}
        </div>
      </div>
    </div>
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
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 overflow-y-auto border-l"
            style={{ backgroundColor: colors.bg, borderColor: colors.borderSubtle }}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b backdrop-blur-xl p-4 flex items-center justify-between"
              style={{ backgroundColor: `${colors.bg}ee`, borderColor: colors.borderSubtle }}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${sc.color}20`, color: sc.color }}>
                  <StatusIcon className="h-3 w-3 inline mr-1" />
                  {sc.label}
                </span>
                <span className="text-[12px]" style={{ color: colors.textTertiary }}>
                  #{booking.id.slice(0, 8)}
                </span>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                aria-label="Chiudi">
                <X className="h-4 w-4" style={{ color: colors.textTertiary }} />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Customer */}
              <div className="rounded-xl border p-4" style={{ borderColor: colors.borderSubtle }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold"
                    style={{ backgroundColor: `${colors.info}20`, color: colors.info }}>
                    {booking.customerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>{booking.customerName}</p>
                    {booking.customerPhone && (
                      <a href={`tel:${booking.customerPhone}`} className="text-[12px] hover:underline" style={{ color: colors.info }}>
                        {booking.customerPhone}
                      </a>
                    )}
                  </div>
                </div>
                {booking.customerPhone && (
                  <div className="flex gap-2">
                    <a href={`tel:${booking.customerPhone}`}
                      className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[12px] font-medium border transition-colors hover:bg-white/5"
                      style={{ borderColor: colors.borderSubtle, color: colors.info }}>
                      <Phone className="h-3.5 w-3.5" /> Chiama
                    </a>
                    <a href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[12px] font-medium border transition-colors hover:bg-white/5"
                      style={{ borderColor: colors.borderSubtle, color: colors.success }}>
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </div>
                )}
              </div>

              {/* Vehicle */}
              <div className="rounded-xl border p-4" style={{ borderColor: colors.borderSubtle }}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: colors.textTertiary }}>Veicolo</h3>
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5" style={{ color: colors.textMuted }} />
                  <div>
                    <p className="text-[14px] font-medium" style={{ color: colors.textPrimary }}>
                      {booking.vehiclePlate}
                    </p>
                    <p className="text-[12px]" style={{ color: colors.textTertiary }}>
                      {booking.vehicleBrand} {booking.vehicleModel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service details */}
              <div className="rounded-xl border p-4" style={{ borderColor: colors.borderSubtle }}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: colors.textTertiary }}>Servizio</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" style={{ color: colors.textMuted }} />
                      <span className="text-[14px]" style={{ color: colors.textPrimary }}>
                        {booking.serviceName || booking.serviceCategory}
                      </span>
                    </div>
                    {booking.estimatedCost !== undefined && (
                      <span className="text-[14px] font-medium" style={{ color: colors.textPrimary }}>
                        {formatCurrency(booking.estimatedCost)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[12px]" style={{ color: colors.textTertiary }}>
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
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: colors.textTertiary }}>
                      <Users className="h-3.5 w-3.5" />
                      {booking.technicianName}
                    </div>
                  )}
                </div>
              </div>

              {/* Status timeline */}
              <div className="rounded-xl border p-4" style={{ borderColor: colors.borderSubtle }}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: colors.textTertiary }}>Stato</h3>
                <div className="flex items-center gap-1">
                  {statusSteps.map((step, i) => {
                    const isActive = stepOrder.indexOf(step.key) <= currentIdx;
                    const isCurrent = step.key === normalized;
                    return (
                      <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full h-1.5 rounded-full" style={{
                          backgroundColor: isActive
                            ? (normalized === 'cancelled' || normalized === 'no_show' ? colors.error : colors.success)
                            : colors.borderSubtle,
                        }} />
                        <span className="text-[9px] font-medium text-center" style={{
                          color: isCurrent ? colors.textPrimary : colors.textMuted,
                        }}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div className="rounded-xl border p-4" style={{ borderColor: colors.borderSubtle }}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: colors.textTertiary }}>Note</h3>
                  <p className="text-[13px]" style={{ color: colors.textSecondary }}>{booking.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {normalized === 'pending' && (
                  <button onClick={() => onStatusChange(booking.id, 'confirmed')}
                    className="w-full h-11 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                    style={{ backgroundColor: colors.success, color: '#000' }}>
                    <CheckCircle2 className="h-4 w-4" /> Conferma Prenotazione
                  </button>
                )}
                {normalized === 'confirmed' && (
                  <button onClick={() => onStatusChange(booking.id, 'in_progress')}
                    className="w-full h-11 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                    style={{ backgroundColor: colors.info, color: '#fff' }}>
                    <PlayCircle className="h-4 w-4" /> Inizia Lavoro
                  </button>
                )}
                {normalized === 'in_progress' && (
                  <button onClick={() => onStatusChange(booking.id, 'completed')}
                    className="w-full h-11 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                    style={{ backgroundColor: colors.purple, color: '#fff' }}>
                    <CheckCircle2 className="h-4 w-4" /> Completa
                  </button>
                )}
                {(normalized === 'pending' || normalized === 'confirmed') && (
                  <>
                    <button onClick={() => onStatusChange(booking.id, 'no_show')}
                      className="w-full h-10 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 border transition-colors hover:bg-white/5"
                      style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}>
                      <UserX className="h-4 w-4" /> No-Show
                    </button>
                    <button onClick={() => onStatusChange(booking.id, 'cancelled')}
                      className="w-full h-10 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 border transition-colors hover:bg-white/5"
                      style={{ borderColor: colors.error, color: colors.error }}>
                      <X className="h-4 w-4" /> Annulla
                    </button>
                  </>
                )}
                <Link href={`/dashboard/work-orders/new?bookingId=${booking.id}`}
                  className="w-full h-11 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
                  style={{ backgroundColor: colors.accent, color: colors.bg }}>
                  <ClipboardList className="h-4 w-4" /> Crea Ordine di Lavoro
                </Link>
                <Link href={`/dashboard/bookings/${booking.id}`}
                  className="w-full h-10 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 border transition-colors hover:bg-white/5"
                  style={{ borderColor: colors.borderSubtle, color: colors.textSecondary }}>
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
      case 'pending': return { bg: 'rgba(251,191,36,0.15)', border: colors.warning, text: colors.warning };
      case 'confirmed': return { bg: 'rgba(96,165,250,0.15)', border: colors.info, text: colors.info };
      case 'in_progress': return { bg: 'rgba(16,185,129,0.15)', border: colors.emerald, text: colors.emerald };
      case 'completed': return { bg: 'rgba(167,139,250,0.15)', border: colors.purple, text: colors.purple };
      default: return { bg: 'rgba(136,136,136,0.15)', border: colors.textMuted, text: colors.textMuted };
    }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent, booking: ExtendedBooking) => {
    setHoveredBooking(booking);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
      {/* Timeline header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: colors.borderSubtle }}>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" style={{ color: colors.textTertiary }} />
          <h3 className="text-[14px] font-medium" style={{ color: colors.textPrimary }}>
            {formatFullDate(new Date().toISOString()).replace(/^\w/, c => c.toUpperCase())}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries({ pending: 'In attesa', confirmed: 'Confermato', in_progress: 'In corso', completed: 'Completato' }).map(([key, label]) => {
            const c = getBookingColor(key);
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.border }} />
                <span className="text-[10px]" style={{ color: colors.textTertiary }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline body */}
      <div ref={timelineRef} className="overflow-x-auto overflow-y-hidden" style={{ scrollBehavior: 'smooth' }}>
        <div style={{ minWidth: totalHours * slotWidth + 140, position: 'relative' }}>
          {/* Hour headers */}
          <div className="flex sticky top-0 z-10" style={{ backgroundColor: colors.surface }}>
            <div className="shrink-0 w-[120px] border-r border-b px-3 flex items-center"
              style={{ borderColor: colors.borderSubtle, height: headerHeight }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Risorsa</span>
            </div>
            {hours.map(h => (
              <div key={h} className="border-r border-b flex items-end pb-1 px-2"
                style={{ width: slotWidth, borderColor: colors.borderSubtle, height: headerHeight }}>
                <span className="text-[10px] font-medium" style={{ color: colors.textMuted }}>
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Bay rows */}
          {TIMELINE_BAYS.map(bay => (
            <div key={bay} className="flex relative" style={{ height: rowHeight }}>
              <div className="shrink-0 w-[120px] border-r border-b px-3 flex items-center"
                style={{ borderColor: colors.borderSubtle }}>
                <span className="text-[12px] font-medium" style={{ color: colors.textSecondary }}>{bay}</span>
              </div>
              <div className="relative flex-1 border-b" style={{ borderColor: colors.borderSubtle }}>
                {/* Hour grid lines */}
                {hours.map(h => (
                  <div key={h} className="absolute top-0 bottom-0 border-r"
                    style={{ left: (h - BUSINESS_HOURS.start) * slotWidth, borderColor: colors.borderSubtle, opacity: 0.5 }} />
                ))}
                {/* Half-hour grid lines */}
                {hours.slice(0, -1).map(h => (
                  <div key={`${h}-30`} className="absolute top-0 bottom-0 border-r border-dashed"
                    style={{ left: (h - BUSINESS_HOURS.start) * slotWidth + slotWidth / 2, borderColor: colors.borderSubtle, opacity: 0.25 }} />
                ))}

                {/* Booking blocks */}
                {(bayBookings[bay] || []).map(booking => {
                  const pos = getBookingPosition(booking);
                  const bColor = getBookingColor(booking.status);
                  const isCancelled = normalizeStatus(booking.status) === 'cancelled';
                  return (
                    <button
                      key={booking.id}
                      onClick={() => onBookingClick(booking)}
                      onMouseMove={(e) => handleMouseMove(e, booking)}
                      onMouseLeave={() => setHoveredBooking(null)}
                      className="absolute top-2 bottom-2 rounded-lg border-l-[3px] px-2 flex items-center gap-2 overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-white/20 hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        left: pos.left,
                        width: pos.width,
                        backgroundColor: bColor.bg,
                        borderLeftColor: bColor.border,
                        textDecoration: isCancelled ? 'line-through' : 'none',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium truncate" style={{ color: bColor.text }}>
                          {booking.serviceName || booking.serviceCategory}
                        </p>
                        <p className="text-[9px] truncate" style={{ color: colors.textTertiary }}>
                          {booking.customerName}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Current time marker */}
              {currentTimePosition > 0 && (
                <div className="absolute top-0 bottom-0 w-[2px] z-20 pointer-events-none"
                  style={{ left: currentTimePosition + 120, backgroundColor: colors.error }}>
                  <div className="w-2 h-2 rounded-full -ml-[3px] -mt-1" style={{ backgroundColor: colors.error }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredBooking && (
        <div
          className="fixed z-50 pointer-events-none rounded-xl border p-3 shadow-xl"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 80,
            backgroundColor: colors.bg,
            borderColor: colors.borderSubtle,
            maxWidth: 260,
          }}
        >
          <p className="text-[13px] font-medium mb-1" style={{ color: colors.textPrimary }}>{hoveredBooking.customerName}</p>
          <p className="text-[11px] mb-1" style={{ color: colors.textTertiary }}>
            {hoveredBooking.vehiclePlate} {hoveredBooking.vehicleBrand} {hoveredBooking.vehicleModel}
          </p>
          <p className="text-[11px] mb-1" style={{ color: colors.textSecondary }}>
            {hoveredBooking.serviceName || hoveredBooking.serviceCategory}
          </p>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: colors.textTertiary }}>
            <span>{formatTime(hoveredBooking.scheduledAt)}</span>
            {hoveredBooking.estimatedDuration && <span>{hoveredBooking.estimatedDuration} min</span>}
            <span>{formatCurrency(hoveredBooking.estimatedCost)}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {Object.values(bayBookings).every(arr => arr.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12">
          <CalendarClock className="h-12 w-12 mb-3" style={{ color: colors.borderSubtle }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: colors.textPrimary }}>Nessuna prenotazione oggi</p>
          <p className="text-[12px]" style={{ color: colors.textTertiary }}>La timeline si popolerà automaticamente</p>
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
        className="rounded-xl border p-3 cursor-pointer transition-all hover:ring-1 hover:ring-white/10 active:scale-[0.99]"
        style={{ borderColor: colors.borderSubtle }}
        onClick={() => onBookingClick(booking)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onBookingClick(booking); }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="text-center shrink-0 w-12">
              <p className="text-[18px] font-light" style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(booking.scheduledAt)}
              </p>
              {showCountdown && (
                <p className="text-[9px] font-medium" style={{ color: colors.info }}>
                  {formatRelativeTime(booking.scheduledAt)}
                </p>
              )}
            </div>
            <div className="w-px h-10 shrink-0" style={{ backgroundColor: sc.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[14px] font-medium truncate" style={{ color: colors.textPrimary }}>{booking.customerName}</p>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: `${sc.color}20`, color: sc.color }}>
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]" style={{ color: colors.textTertiary }}>
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
              <button onClick={(e) => { e.stopPropagation(); onStatusChange(booking.id, 'confirmed'); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                title="Conferma" aria-label="Conferma prenotazione">
                <CheckCircle2 className="h-4 w-4" style={{ color: colors.success }} />
              </button>
            )}
            {normalizeStatus(booking.status) === 'confirmed' && (
              <button onClick={(e) => { e.stopPropagation(); onStatusChange(booking.id, 'in_progress'); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                title="Check-in" aria-label="Check-in">
                <PlayCircle className="h-4 w-4" style={{ color: colors.info }} />
              </button>
            )}
            {booking.customerPhone && (
              <>
                <a href={`tel:${booking.customerPhone}`} onClick={e => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                  title="Chiama" aria-label="Chiama cliente">
                  <Phone className="h-3.5 w-3.5" style={{ color: colors.info }} />
                </a>
                <a href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                  title="WhatsApp" aria-label="WhatsApp">
                  <MessageCircle className="h-3.5 w-3.5" style={{ color: colors.success }} />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Progress bar for in_progress */}
        {normalizeStatus(booking.status) === 'in_progress' && booking.estimatedDuration && (
          <div className="mt-2 ml-[72px]">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.borderSubtle }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: colors.emerald }}
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
      <div className="rounded-2xl border p-4 text-center" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
        <p className="text-[36px] font-light tracking-tight" style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-[13px]" style={{ color: colors.textTertiary }}>
          {formatFullDate(now.toISOString()).replace(/^\w/, c => c.toUpperCase())}
        </p>
      </div>

      {/* In corso */}
      {inProgress.length > 0 && (
        <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.emerald }} />
            <h3 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: colors.emerald }}>
              In corso adesso ({inProgress.length})
            </h3>
          </div>
          {inProgress.map(b => <AgendaCard key={b.id} booking={b} />)}
        </div>
      )}

      {/* Upcoming */}
      <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
        <h3 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: colors.info }}>
          Prossimi ({upcoming.length})
        </h3>
        {upcoming.length > 0 ? (
          upcoming.map(b => <AgendaCard key={b.id} booking={b} showCountdown />)
        ) : (
          <p className="text-[13px] py-4 text-center" style={{ color: colors.textTertiary }}>
            Nessuna prenotazione in arrivo per oggi
          </p>
        )}
      </div>

      {/* Completed */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="w-full flex items-center justify-between text-[13px] font-semibold uppercase tracking-wider transition-colors"
          style={{ color: colors.textTertiary }}
        >
          <span>Completati oggi ({completedToday.length})</span>
          {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
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
                <p className="text-[13px] py-2 text-center" style={{ color: colors.textTertiary }}>
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
      <div className="flex flex-col items-center justify-center py-16">
        <Search className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
        <p className="text-[15px] font-medium mb-1" style={{ color: colors.textPrimary }}>Nessun risultato</p>
        <p className="text-[13px]" style={{ color: colors.textTertiary }}>Prova a modificare i filtri di ricerca</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative mb-6">
        <Calendar className="h-16 w-16" style={{ color: colors.borderSubtle }} />
        <Sparkles className="h-6 w-6 absolute -top-1 -right-1" style={{ color: colors.warning }} />
      </div>
      <p className="text-[18px] font-medium mb-2" style={{ color: colors.textPrimary }}>
        Nessuna prenotazione per oggi
      </p>
      <p className="text-[13px] max-w-sm text-center mb-6" style={{ color: colors.textTertiary }}>
        Il calendario è libero. Crea la prima prenotazione o condividi il link di prenotazione con i tuoi clienti.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/bookings/new"
          className="flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: colors.accent, color: colors.bg }}>
          <Plus className="h-4 w-4" /> Nuova Prenotazione
        </Link>
      </div>
    </div>
  );
}

// =============================================================================
// Loading Skeletons
// =============================================================================
function ListSkeleton(): React.JSX.Element {
  return (
    <div className="divide-y" style={{ borderColor: colors.borderSubtle }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-5 animate-pulse">
          <div className="w-1 h-12 rounded-full" style={{ backgroundColor: colors.borderSubtle }} />
          <div className="flex-1 space-y-2">
            <div className="w-40 h-4 rounded" style={{ backgroundColor: colors.borderSubtle }} />
            <div className="w-56 h-3 rounded" style={{ backgroundColor: colors.glowStrong }} />
          </div>
          <div className="w-16 h-4 rounded" style={{ backgroundColor: colors.borderSubtle }} />
        </div>
      ))}
    </div>
  );
}

function TimelineSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-2xl border p-4 animate-pulse" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
      <div className="h-6 w-48 rounded mb-4" style={{ backgroundColor: colors.borderSubtle }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 mb-3">
          <div className="w-20 h-4 rounded" style={{ backgroundColor: colors.borderSubtle }} />
          <div className="flex-1 h-10 rounded-lg" style={{ backgroundColor: colors.glowStrong }} />
        </div>
      ))}
    </div>
  );
}

function KanbanSkeleton(): React.JSX.Element {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 rounded-2xl p-4 animate-pulse" style={{ backgroundColor: colors.glowStrong }}>
          <div className="h-4 w-24 rounded mb-4" style={{ backgroundColor: colors.borderSubtle }} />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-28 rounded-xl" style={{ backgroundColor: colors.surface }} />
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
      <div className="rounded-2xl border p-4 h-24" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
        <div className="h-10 w-24 rounded mx-auto mb-2" style={{ backgroundColor: colors.borderSubtle }} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
          <div className="h-4 w-32 rounded mb-3" style={{ backgroundColor: colors.borderSubtle }} />
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="h-16 rounded-xl mb-2" style={{ backgroundColor: colors.glowStrong }} />
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
    { label: 'Oggi', value: todayCount, icon: Calendar, color: colors.info, trend: undefined },
    { label: 'Tasso Conferma', value: `${confirmRate}`, suffix: '%', icon: CheckCircle2, color: colors.success, sparkData: [60, 65, 72, 68, 75, 80, confirmRate] },
    { label: 'In Attesa', value: pendingCount, icon: Clock, color: colors.warning, trend: undefined },
    { label: 'Revenue Oggi', value: formatCurrency(todayRevenue), icon: BarChart3, color: colors.purple, trend: undefined },
    { label: 'No-Show', value: `${noShowRate}`, suffix: '%', icon: UserX, color: colors.error, trend: noShowRate > 5 ? noShowRate : -noShowRate },
    { label: 'In Corso', value: inProgressCount, icon: PlayCircle, color: colors.emerald, trend: undefined },
    { label: 'Completate', value: completedCount, icon: CheckCircle2, color: colors.purple, trend: undefined },
    { label: 'Totale', value: totalCount, icon: CalendarDays, color: colors.textSecondary, sparkData: [totalCount * 0.6, totalCount * 0.7, totalCount * 0.8, totalCount * 0.85, totalCount * 0.9, totalCount * 0.95, totalCount] },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* ================================================================= */}
      {/* Header */}
      {/* ================================================================= */}
      <header
        className="border-b backdrop-blur-xl sticky top-0 z-30"
        style={{ backgroundColor: `${colors.bg}cc`, borderColor: colors.borderSubtle }}
      >
        <div className="px-4 sm:px-8 py-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <button type="button"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{ color: colors.textTertiary }} aria-label="Torna alla dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[28px] font-light tracking-tight" style={{ color: colors.textPrimary }}>
                    Prenotazioni
                  </h1>
                  <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.glowStrong, color: colors.textTertiary }}>
                    {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: colors.textTertiary }}>
                  Oggi: {todaySummary}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Toggle */}
              <div className="inline-flex rounded-xl p-1" style={{ backgroundColor: colors.glowStrong }}>
                {viewModes.map(({ mode, icon: ModeIcon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1.5 min-h-[36px]"
                    style={{
                      backgroundColor: viewMode === mode ? colors.surface : 'transparent',
                      color: viewMode === mode ? colors.textPrimary : colors.textMuted,
                    }}
                    aria-label={`Vista ${label}`}
                  >
                    <ModeIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
              <Link href="/dashboard/calendar">
                <button type="button"
                  className="flex items-center gap-2 h-9 px-3 rounded-full border text-[12px] font-medium transition-all hover:bg-white/5"
                  style={{ borderColor: colors.border, color: colors.textSecondary }}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Calendario</span>
                </button>
              </Link>
              <Link href="/dashboard/bookings/new">
                <button type="button"
                  className="flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium transition-all hover:opacity-90"
                  style={{ backgroundColor: colors.accent, color: colors.bg }}>
                  <Plus className="h-3.5 w-3.5" />
                  Nuova Prenotazione
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-5">
        {/* ================================================================= */}
        {/* KPI Cards (2 rows of 4) */}
        {/* ================================================================= */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <motion.div key={kpi.label} variants={itemVariants}>
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
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
            {/* Quick filters */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { key: 'all' as const, label: 'Tutte' },
                  { key: 'today' as const, label: 'Oggi' },
                  { key: 'week' as const, label: 'Settimana' },
                  { key: 'pending' as const, label: 'In attesa' },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => handleQuickFilter(tab.key)}
                    className="h-8 px-3 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      backgroundColor: quickFilter === tab.key ? colors.accent : 'transparent',
                      color: quickFilter === tab.key ? colors.bg : colors.textSecondary,
                      border: quickFilter === tab.key ? 'none' : `1px solid ${colors.borderSubtle}`,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button onClick={() => { setSearchQuery(''); setSelectedDate(''); setSelectedStatus(''); }}
                    className="text-[11px] px-2 py-1 rounded-lg flex items-center gap-1 transition-colors hover:bg-white/5"
                    style={{ color: colors.error }}>
                    <X className="h-3 w-3" /> Cancella filtri ({activeFilterCount})
                  </button>
                )}
                {viewMode === 'list' && (
                  <button onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                    title={density === 'compact' ? 'Espandi righe' : 'Compatta righe'}
                    aria-label="Cambia densità">
                    {density === 'compact' ? <Eye className="h-3.5 w-3.5" style={{ color: colors.textMuted }} /> : <EyeOff className="h-3.5 w-3.5" style={{ color: colors.textMuted }} />}
                  </button>
                )}
              </div>
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.textMuted }} />
                <input
                  type="text"
                  placeholder="Cerca per cliente, veicolo o servizio..."
                  aria-label="Cerca prenotazioni"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border text-[13px] outline-none transition-colors focus:border-white/30"
                  style={{ backgroundColor: colors.glowStrong, borderColor: colors.borderSubtle, color: colors.textPrimary }}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); if (e.target.value) setQuickFilter('all'); }}
                  aria-label="Filtra per data"
                  className="h-10 px-3 rounded-xl border text-[13px] outline-none transition-colors focus:border-white/30"
                  style={{ backgroundColor: colors.glowStrong, borderColor: colors.borderSubtle, color: colors.textPrimary, colorScheme: 'dark' }}
                />
                <select
                  value={selectedStatus}
                  onChange={e => { setSelectedStatus(e.target.value); if (e.target.value) setQuickFilter('all'); }}
                  aria-label="Filtra per stato"
                  className="h-10 px-3 rounded-xl border text-[13px] outline-none transition-colors focus:border-white/30"
                  style={{ backgroundColor: colors.glowStrong, borderColor: colors.borderSubtle, color: colors.textPrimary }}
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
                className="mt-3 pt-3 border-t flex items-center gap-3" style={{ borderColor: colors.borderSubtle }}>
                <span className="text-[12px]" style={{ color: colors.textTertiary }}>
                  {selectedIds.size} selezionat{selectedIds.size === 1 ? 'o' : 'i'}
                </span>
                <button onClick={async () => {
                  for (const id of selectedIds) {
                    await updateBooking.mutateAsync({ id, status: 'confirmed' }).catch(() => null);
                  }
                  toast.success(`${selectedIds.size} prenotazioni confermate`);
                  setSelectedIds(new Set());
                  refetch();
                }}
                  className="h-7 px-3 rounded-lg text-[11px] font-medium"
                  style={{ backgroundColor: `${colors.success}20`, color: colors.success }}>
                  Conferma tutti
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  className="h-7 px-3 rounded-lg text-[11px] font-medium"
                  style={{ color: colors.textMuted }}>
                  Deseleziona
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ================================================================= */}
        {/* Content */}
        {/* ================================================================= */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
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
                isLoading ? <KanbanSkeleton /> : error ? (
                  <ErrorState onRetry={refetch} />
                ) : (
                  <KanbanBoard columns={kanbanColumns} onStatusChange={handleStatusChange} />
                )
              )}

              {/* ---- TIMELINE ---- */}
              {viewMode === 'timeline' && (
                isLoading ? <TimelineSkeleton /> : error ? (
                  <ErrorState onRetry={refetch} />
                ) : (
                  <TimelineView bookings={bookings} onBookingClick={openDrawer} />
                )
              )}

              {/* ---- AGENDA ---- */}
              {viewMode === 'agenda' && (
                isLoading ? <AgendaSkeleton /> : error ? (
                  <ErrorState onRetry={refetch} />
                ) : (
                  <AgendaView
                    bookings={bookings}
                    onBookingClick={openDrawer}
                    onStatusChange={handleSingleStatusChange}
                  />
                )
              )}

              {/* ---- LIST ---- */}
              {viewMode === 'list' && (
                <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}>
                  {/* Table header */}
                  <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider border-b"
                    style={{ color: colors.textMuted, borderColor: colors.borderSubtle }}>
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

                  <div className="divide-y" style={{ borderColor: colors.borderSubtle }}>
                    {isLoading ? (
                      <ListSkeleton />
                    ) : error ? (
                      <ErrorState onRetry={refetch} />
                    ) : bookings.length === 0 ? (
                      <EmptyState hasFilters={!!hasActiveFilters || quickFilter !== 'all'} />
                    ) : (
                      sortedBookings.map(booking => {
                        const sc = getStatusConfig(booking.status);
                        const isSelected = selectedIds.has(booking.id);
                        const padY = density === 'compact' ? 'py-2' : 'py-3.5';
                        return (
                          <div
                            key={booking.id}
                            className={`group flex items-center gap-3 px-4 ${padY} transition-colors cursor-pointer`}
                            style={{ backgroundColor: isSelected ? colors.glowStrong : 'transparent' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = isSelected ? colors.glowStrong : colors.surfaceHover; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = isSelected ? colors.glowStrong : 'transparent'; }}
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
                                <p className="text-[13px] font-medium" style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                                  {formatTime(booking.scheduledAt)}
                                </p>
                                <p className="text-[10px]" style={{ color: colors.textTertiary }}>{formatDate(booking.scheduledAt)}</p>
                              </div>

                              {/* Customer */}
                              <div className="col-span-2">
                                <p className="text-[13px] font-medium truncate" style={{ color: colors.textPrimary }}>
                                  {booking.customerName}
                                </p>
                                {booking.customerPhone && (
                                  <p className="text-[10px] truncate" style={{ color: colors.textTertiary }}>{booking.customerPhone}</p>
                                )}
                              </div>

                              {/* Vehicle */}
                              <div className="col-span-2 hidden lg:block">
                                <p className="text-[12px] font-mono" style={{ color: colors.textPrimary }}>{booking.vehiclePlate}</p>
                                <p className="text-[10px] truncate" style={{ color: colors.textTertiary }}>
                                  {booking.vehicleBrand} {booking.vehicleModel}
                                </p>
                              </div>

                              {/* Service */}
                              <div className="col-span-2 hidden lg:block">
                                <p className="text-[12px] truncate" style={{ color: colors.textSecondary }}>
                                  {booking.serviceName || booking.serviceCategory}
                                </p>
                                {booking.estimatedDuration && (
                                  <p className="text-[10px]" style={{ color: colors.textTertiary }}>{booking.estimatedDuration} min</p>
                                )}
                              </div>

                              {/* Technician */}
                              <div className="col-span-1 hidden lg:block">
                                <p className="text-[11px] truncate" style={{ color: colors.textTertiary }}>
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
                                <p className="text-[13px] font-medium" style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                                  {formatCurrency(booking.estimatedCost)}
                                </p>
                              </div>

                              {/* Mobile meta */}
                              <div className="flex items-center gap-3 text-[11px] mt-0.5 lg:hidden" style={{ color: colors.textTertiary }}>
                                <span>{formatTime(booking.scheduledAt)}</span>
                                <span>{booking.vehiclePlate}</span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${sc.color}20`, color: sc.color }}>{sc.label}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity col-span-2 justify-end shrink-0">
                              {normalizeStatus(booking.status) === 'pending' && (
                                <button onClick={(e) => { e.stopPropagation(); handleSingleStatusChange(booking.id, 'confirmed'); }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                  title="Conferma" aria-label="Conferma">
                                  <CheckCircle2 className="h-4 w-4" style={{ color: colors.success }} />
                                </button>
                              )}
                              {normalizeStatus(booking.status) === 'confirmed' && (
                                <button onClick={(e) => { e.stopPropagation(); handleSingleStatusChange(booking.id, 'in_progress'); }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                  title="Check-in" aria-label="Check-in">
                                  <PlayCircle className="h-4 w-4" style={{ color: colors.info }} />
                                </button>
                              )}
                              {booking.customerPhone && (
                                <>
                                  <a href={`tel:${booking.customerPhone}`} onClick={e => e.stopPropagation()}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                    title="Chiama" aria-label="Chiama">
                                    <Phone className="h-3.5 w-3.5" style={{ color: colors.info }} />
                                  </a>
                                  <a href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                                    target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                    title="WhatsApp" aria-label="WhatsApp">
                                    <MessageCircle className="h-3.5 w-3.5" style={{ color: colors.success }} />
                                  </a>
                                </>
                              )}
                              <Link href={`/dashboard/work-orders/new?bookingId=${booking.id}`} onClick={e => e.stopPropagation()}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                  title="Crea OdL" aria-label="Crea Ordine di Lavoro">
                                  <ClipboardList className="h-3.5 w-3.5" style={{ color: colors.purple }} />
                                </div>
                              </Link>
                            </div>

                            <ChevronRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
                              style={{ color: colors.textTertiary }} />
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Pagination */}
                  {total > PAGE_SIZE && (
                    <div className="px-4 py-3 border-t" style={{ borderColor: colors.borderSubtle }}>
                      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

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
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-0.5 hover:text-white/80 transition-colors"
    >
      {label}
      {isActive && (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );
}

// =============================================================================
// Error State
// =============================================================================
function ErrorState({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.error }} />
      <p className="text-[15px] font-medium mb-2" style={{ color: colors.textPrimary }}>
        Si è verificato un errore
      </p>
      <p className="text-[13px] mb-4" style={{ color: colors.textTertiary }}>
        Impossibile caricare le prenotazioni
      </p>
      <button onClick={onRetry}
        className="h-10 px-5 rounded-full text-[13px] font-medium flex items-center gap-2"
        style={{ backgroundColor: colors.accent, color: colors.bg }}>
        <RefreshCw className="h-4 w-4" /> Riprova
      </button>
    </div>
  );
}
