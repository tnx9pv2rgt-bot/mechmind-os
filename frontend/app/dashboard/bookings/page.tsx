'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import Link from 'next/link';
import { Pagination } from '@/components/ui/pagination';
import { useBookings, useBookingStats, useUpdateBooking } from '@/hooks/useApi';
import { KanbanBoard } from '@/components/bookings/kanban/kanban-board';
import type { KanbanColumnData } from '@/components/bookings/kanban/kanban-column';
import type { BookingCardData } from '@/components/bookings/kanban/kanban-card';
import { toast } from 'sonner';

// =============================================================================
// Design Tokens — same as dashboard
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
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// =============================================================================
// Status config
// =============================================================================
const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'In attesa', color: colors.warning },
  PENDING: { label: 'In attesa', color: colors.warning },
  confirmed: { label: 'Confermato', color: colors.success },
  CONFIRMED: { label: 'Confermato', color: colors.success },
  in_progress: { label: 'In corso', color: colors.info },
  IN_PROGRESS: { label: 'In corso', color: colors.info },
  'in-progress': { label: 'In corso', color: colors.info },
  completed: { label: 'Completato', color: colors.purple },
  COMPLETED: { label: 'Completato', color: colors.purple },
  cancelled: { label: 'Annullato', color: colors.error },
  CANCELLED: { label: 'Annullato', color: colors.error },
  no_show: { label: 'Non presentato', color: colors.textMuted },
  NO_SHOW: { label: 'Non presentato', color: colors.textMuted },
};

type QuickFilter = 'all' | 'today' | 'week' | 'pending';
type ViewMode = 'list' | 'kanban';

const KANBAN_COLUMNS: { id: string; title: string; color: string }[] = [
  { id: 'pending', title: 'In Attesa', color: 'bg-amber-500' },
  { id: 'confirmed', title: 'Confermata', color: 'bg-green-500' },
  { id: 'cancelled', title: 'Annullata', color: 'bg-red-500' },
  { id: 'no_show', title: 'Non Presentato', color: 'bg-gray-400' },
  { id: 'completed', title: 'Completata', color: 'bg-blue-600' },
];

function formatCurrency(value: number | undefined): string {
  if (!value) return '\u2014';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

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

function normalizeStatus(status: string): string {
  return status.toLowerCase().replace('-', '_');
}

// =============================================================================
// Main Page
// =============================================================================
export default function BookingsPage(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = viewMode === 'kanban' ? 200 : 20;

  const updateBooking = useUpdateBooking();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedDate, selectedStatus, quickFilter]);

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

  const bookings = bookingsData?.data ?? [];
  const total = bookingsData?.total ?? 0;

  const todayCount = todayStats?.total ?? 0;
  const totalCount = stats?.total ?? 0;
  const pendingCount = stats?.byStatus?.PENDING ?? stats?.byStatus?.pending ?? 0;
  const completedCount = stats?.byStatus?.COMPLETED ?? stats?.byStatus?.completed ?? 0;

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

  const handleStatusChange = useCallback(
    async (itemId: string, _fromStatus: string, toStatus: string) => {
      try {
        await updateBooking.mutateAsync({ id: itemId, status: toStatus });
        toast.success(`Stato aggiornato a "${statusConfig[toStatus]?.label || toStatus}"`);
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

  const kpiCards = [
    { label: 'Oggi', value: todayCount, icon: Calendar, color: colors.info },
    { label: 'Totale', value: totalCount, icon: CalendarDays, color: colors.purple },
    { label: 'In attesa', value: pendingCount, icon: Clock, color: colors.warning },
    { label: 'Completate', value: completedCount, icon: CheckCircle2, color: colors.success },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* ================================================================= */}
      {/* Header */}
      {/* ================================================================= */}
      <header
        className="border-b backdrop-blur-xl sticky top-0 z-10"
        style={{ backgroundColor: `${colors.bg}cc`, borderColor: colors.borderSubtle }}
      >
        <div className="px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button
                type="button"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ color: colors.textTertiary }}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-[28px] font-light tracking-tight" style={{ color: colors.textPrimary }}>
                Prenotazioni
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Gestisci gli appuntamenti della tua officina
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div
              className="inline-flex rounded-xl p-1"
              style={{ backgroundColor: colors.glowStrong }}
            >
              {(['list', 'kanban'] as const).map((mode) => {
                const ModeIcon = mode === 'list' ? List : Columns3;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 min-h-[36px]"
                    style={{
                      backgroundColor: viewMode === mode ? colors.surface : 'transparent',
                      color: viewMode === mode ? colors.textPrimary : colors.textMuted,
                    }}
                  >
                    <ModeIcon className="h-3.5 w-3.5" />
                    {mode === 'list' ? 'Lista' : 'Kanban'}
                  </button>
                );
              })}
            </div>
            <Link href="/dashboard/calendar">
              <button
                type="button"
                className="flex items-center gap-2 h-10 px-4 rounded-full border text-[13px] font-medium transition-all hover:bg-white/5"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                <CalendarDays className="h-4 w-4" />
                Calendario
              </button>
            </Link>
            <Link href="/dashboard/bookings/new">
              <button
                type="button"
                className="flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium transition-all hover:bg-white/10"
                style={{ backgroundColor: colors.accent, color: colors.bg }}
              >
                <Plus className="h-4 w-4" />
                Nuova Prenotazione
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8 space-y-6">
        {/* ================================================================= */}
        {/* KPI Cards */}
        {/* ================================================================= */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {kpiCards.map((kpi) => {
            const KpiIcon = kpi.icon;
            return (
              <motion.div key={kpi.label} variants={itemVariants}>
                <div
                  className="rounded-2xl border p-5 h-[120px] flex flex-col justify-center"
                  style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${kpi.color}15` }}
                    >
                      <span style={{ color: kpi.color }}><KpiIcon className="h-5 w-5" /></span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: colors.textTertiary }}>
                        {kpi.label}
                      </p>
                      <p
                        className="text-[28px] font-light tracking-tight"
                        style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {isLoading ? '\u2014' : kpi.value}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ================================================================= */}
        {/* Quick Filters */}
        {/* ================================================================= */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {([
              { key: 'all', label: 'Tutte' },
              { key: 'today', label: 'Oggi' },
              { key: 'week', label: 'Questa settimana' },
              { key: 'pending', label: 'In attesa' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => handleQuickFilter(tab.key)}
                className="inline-flex items-center justify-center h-10 px-4 rounded-full text-[13px] font-medium leading-none transition-all"
                style={{
                  backgroundColor: quickFilter === tab.key ? colors.accent : 'transparent',
                  color: quickFilter === tab.key ? colors.bg : colors.textSecondary,
                  border: quickFilter === tab.key ? 'none' : `1px solid ${colors.border}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ================================================================= */}
        {/* Search & Filters */}
        {/* ================================================================= */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div
            className="rounded-2xl border p-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: colors.textMuted }}
                />
                <input
                  type="text"
                  placeholder="Cerca per cliente, veicolo o servizio..."
                  aria-label="Cerca prenotazioni"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 rounded-xl border text-[14px] outline-none transition-colors focus:border-white/30"
                  style={{
                    backgroundColor: colors.glowStrong,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  }}
                />
              </div>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    if (e.target.value) setQuickFilter('all');
                  }}
                  aria-label="Filtra per data"
                  className="h-11 px-3 rounded-xl border text-[14px] outline-none transition-colors focus:border-white/30"
                  style={{
                    backgroundColor: colors.glowStrong,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                    colorScheme: 'dark',
                  }}
                />
                <select
                  value={selectedStatus}
                  onChange={e => {
                    setSelectedStatus(e.target.value);
                    if (e.target.value) setQuickFilter('all');
                  }}
                  aria-label="Filtra per stato"
                  className="h-11 px-3 rounded-xl border text-[14px] outline-none transition-colors focus:border-white/30"
                  style={{
                    backgroundColor: colors.glowStrong,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  }}
                >
                  <option value="">Tutti gli stati</option>
                  <option value="pending">In attesa</option>
                  <option value="confirmed">Confermato</option>
                  <option value="cancelled">Annullato</option>
                  <option value="no_show">Non presentato</option>
                  <option value="completed">Completato</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ================================================================= */}
        {/* Content */}
        {/* ================================================================= */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          {viewMode === 'kanban' ? (
            isLoading ? (
              <div className="flex gap-4 overflow-x-auto">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-72 shrink-0 rounded-2xl p-4 animate-pulse"
                    style={{ backgroundColor: colors.glowStrong }}
                  >
                    <div className="h-4 w-24 rounded mb-4" style={{ backgroundColor: colors.borderSubtle }} />
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="h-28 rounded-xl" style={{ backgroundColor: colors.surface }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.error }} />
                <p className="text-[15px] mb-4" style={{ color: colors.textTertiary }}>Errore caricamento</p>
                <button
                  onClick={() => refetch()}
                  className="h-10 px-4 rounded-full text-[13px] font-medium"
                  style={{ backgroundColor: colors.accent, color: colors.bg }}
                >
                  Riprova
                </button>
              </div>
            ) : (
              <KanbanBoard columns={kanbanColumns} onStatusChange={handleStatusChange} />
            )
          ) : (
            /* LIST VIEW */
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              {/* Table header */}
              <div
                className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider border-b"
                style={{ color: colors.textMuted, borderColor: colors.borderSubtle }}
              >
                <div className="col-span-2">Data/Ora</div>
                <div className="col-span-3">Cliente</div>
                <div className="col-span-2">Veicolo</div>
                <div className="col-span-2">Servizio</div>
                <div className="col-span-1">Stato</div>
                <div className="col-span-1">Costo</div>
                <div className="col-span-1" />
              </div>

              <div className="divide-y" style={{ borderColor: colors.borderSubtle }}>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 animate-pulse">
                      <div className="w-1 h-12 rounded-full" style={{ backgroundColor: colors.borderSubtle }} />
                      <div className="flex-1 space-y-2">
                        <div className="w-32 h-4 rounded" style={{ backgroundColor: colors.borderSubtle }} />
                        <div className="w-48 h-3 rounded" style={{ backgroundColor: colors.glowStrong }} />
                      </div>
                    </div>
                  ))
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.error }} />
                    <p className="text-[15px] font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Si è verificato un errore
                    </p>
                    <p className="text-[13px] mb-4" style={{ color: colors.textTertiary }}>
                      Impossibile caricare le prenotazioni
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="h-10 px-4 rounded-full text-[13px] font-medium"
                      style={{ backgroundColor: colors.accent, color: colors.bg }}
                    >
                      Riprova
                    </button>
                  </div>
                ) : bookings.length === 0 && !debouncedSearch && !selectedDate && !selectedStatus && quickFilter === 'all' ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Calendar className="h-16 w-16 mb-4" style={{ color: colors.borderSubtle }} />
                    <p className="text-[15px] font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Nessuna prenotazione
                    </p>
                    <p className="text-[13px] mb-4" style={{ color: colors.textTertiary }}>
                      Crea la prima prenotazione per iniziare
                    </p>
                    <Link
                      href="/dashboard/bookings/new"
                      className="h-10 px-4 rounded-full text-[13px] font-medium inline-flex items-center gap-2"
                      style={{ backgroundColor: colors.accent, color: colors.bg }}
                    >
                      <Plus className="h-4 w-4" /> Nuova Prenotazione
                    </Link>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Search className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
                    <p className="text-[13px]" style={{ color: colors.textTertiary }}>
                      Nessuna prenotazione trovata
                    </p>
                  </div>
                ) : (
                  bookings.map(booking => {
                    const sc = statusConfig[booking.status] || { label: booking.status, color: colors.textMuted };
                    return (
                      <Link href={`/dashboard/bookings/${booking.id}`} key={booking.id}>
                        <div
                          className="group flex items-center gap-4 p-4 sm:p-5 transition-colors cursor-pointer"
                          style={{ backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {/* Status bar */}
                          <div
                            className="w-1 h-12 rounded-full shrink-0"
                            style={{ backgroundColor: sc.color }}
                          />

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-1">
                              <p
                                className="text-[15px] font-medium truncate"
                                style={{ color: colors.textPrimary }}
                              >
                                {booking.customerName}
                              </p>
                              <span
                                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: `${sc.color}20`,
                                  color: sc.color,
                                }}
                              >
                                {sc.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-[12px]" style={{ color: colors.textTertiary }}>
                              <span className="flex items-center gap-1">
                                <Car className="h-3.5 w-3.5 shrink-0" />
                                {booking.vehiclePlate}
                                {booking.vehicleBrand && ` ${booking.vehicleBrand} ${booking.vehicleModel || ''}`}
                              </span>
                              <span className="flex items-center gap-1">
                                <Wrench className="h-3.5 w-3.5 shrink-0" />
                                {booking.serviceName || booking.serviceCategory}
                              </span>
                            </div>
                          </div>

                          {/* Quick actions */}
                          {booking.customerPhone && (
                            <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={`tel:${booking.customerPhone}`}
                                onClick={e => e.stopPropagation()}
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                              >
                                <Phone className="h-4 w-4" style={{ color: colors.info }} />
                              </a>
                              <a
                                href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                              >
                                <MessageCircle className="h-4 w-4" style={{ color: colors.success }} />
                              </a>
                            </div>
                          )}

                          {/* Time & Cost */}
                          <div className="text-right hidden sm:block">
                            <p
                              className="text-[14px] font-medium"
                              style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                            >
                              {new Date(booking.scheduledAt).toLocaleTimeString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="text-[12px]" style={{ color: colors.textTertiary }}>
                              {new Date(booking.scheduledAt).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <div className="text-right min-w-[80px] hidden sm:block">
                            <p
                              className="text-[15px] font-medium"
                              style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                            >
                              {formatCurrency(booking.estimatedCost)}
                            </p>
                          </div>

                          <ChevronRight
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
                            style={{ color: colors.textTertiary }}
                          />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {viewMode === 'list' && total > PAGE_SIZE && (
                <div className="px-6 py-4 border-t" style={{ borderColor: colors.borderSubtle }}>
                  <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
