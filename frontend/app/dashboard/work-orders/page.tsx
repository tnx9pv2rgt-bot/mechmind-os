'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Plus,
  Eye,
  Search,
  LayoutList,
  LayoutGrid,
  User,
  Car,
  Clock,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils/format';

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
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
};

// =============================================================================
// Animation Variants
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// =============================================================================
// Types & Config
// =============================================================================
interface WorkOrder {
  id: string;
  woNumber: string;
  status: string;
  priority?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  customerName?: string;
  technicianName?: string;
  totalCost: number;
  estimatedHours?: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrdersResponse {
  data: WorkOrder[];
  total: number;
  page: number;
  limit: number;
}

type ViewMode = 'list' | 'kanban';

const STATUS_CONFIG: Record<string, { label: string; color: string; barColor: string }> = {
  DRAFT: { label: 'Bozza', color: colors.textMuted, barColor: colors.textMuted },
  OPEN: { label: 'Aperto', color: colors.info, barColor: colors.info },
  IN_PROGRESS: { label: 'In Lavorazione', color: colors.warning, barColor: colors.warning },
  QC: { label: 'Controllo Qualit\u00e0', color: colors.purple, barColor: colors.purple },
  COMPLETED: { label: 'Completato', color: colors.success, barColor: colors.success },
  DELIVERED: { label: 'Consegnato', color: '#22d3ee', barColor: '#22d3ee' },
  CANCELLED: { label: 'Annullato', color: colors.error, barColor: colors.error },
  PENDING: { label: 'In Attesa', color: colors.warning, barColor: colors.warning },
  WAITING_PARTS: { label: 'Attesa Ricambi', color: '#fb923c', barColor: '#fb923c' },
  READY: { label: 'Pronto', color: colors.success, barColor: colors.success },
  INVOICED: { label: 'Fatturato', color: '#22d3ee', barColor: '#22d3ee' },
};

const KANBAN_COLUMNS = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'QC', 'COMPLETED', 'DELIVERED'] as const;

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Bassa', color: colors.textMuted },
  NORMAL: { label: 'Normale', color: colors.info },
  HIGH: { label: 'Alta', color: '#fb923c' },
  URGENT: { label: 'Urgente', color: colors.error },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'OPEN', label: 'Aperto' },
  { value: 'IN_PROGRESS', label: 'In Lavorazione' },
  { value: 'QC', label: 'Controllo Qualit\u00e0' },
  { value: 'COMPLETED', label: 'Completato' },
  { value: 'DELIVERED', label: 'Consegnato' },
  { value: 'CANCELLED', label: 'Annullato' },
];

export default function WorkOrdersPage(): React.ReactElement {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildUrl = useCallback((): string => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter) params.set('status', statusFilter);
    return `/api/dashboard/work-orders?${params.toString()}`;
  }, [page, debouncedSearch, statusFilter]);

  const { data: rawData, error, isLoading, mutate } = useSWR<WorkOrdersResponse | WorkOrder[]>(
    buildUrl(),
    fetcher,
  );

  const workOrders: WorkOrder[] = (() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if ('data' in rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  })();

  const total = (() => {
    if (!rawData) return 0;
    if (Array.isArray(rawData)) return rawData.length;
    if ('total' in rawData) return rawData.total;
    return workOrders.length;
  })();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleChangeStatus = async (woId: string, newStatus: string): Promise<void> => {
    try {
      const res = await fetch(`/api/dashboard/work-orders/${woId}/transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || json.message || 'Transizione non consentita');
      }
      toast.success(`Stato aggiornato a "${STATUS_CONFIG[newStatus]?.label || newStatus}"`);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il cambio stato');
    }
  };

  const getStatus = (status: string): { label: string; color: string; barColor: string } =>
    STATUS_CONFIG[status] || { label: status, color: colors.textMuted, barColor: colors.textMuted };

  // KPI counts
  const openCount = workOrders.filter(w => w.status === 'OPEN').length;
  const inProgressCount = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
  const completedCount = workOrders.filter(w => w.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: `${colors.bg}cc`,
          borderColor: colors.borderSubtle,
        }}
      >
        <div className="px-4 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              style={{ color: colors.textTertiary }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Ordini di Lavoro
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Gestisci le lavorazioni della tua officina
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div
              className="flex items-center rounded-full overflow-hidden border"
              style={{ borderColor: colors.borderSubtle }}
            >
              <button
                onClick={() => setViewMode('list')}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: viewMode === 'list' ? colors.textPrimary : 'transparent',
                  color: viewMode === 'list' ? colors.bg : colors.textTertiary,
                }}
                aria-label="Vista lista"
                title="Vista lista"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: viewMode === 'kanban' ? colors.textPrimary : 'transparent',
                  color: viewMode === 'kanban' ? colors.bg : colors.textTertiary,
                }}
                aria-label="Vista kanban"
                title="Vista kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Link href="/dashboard/work-orders/new">
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
                style={{
                  backgroundColor: colors.textPrimary,
                  color: colors.bg,
                }}
              >
                <Plus className="h-4 w-4" />
                Nuovo OdL
              </button>
            </Link>
          </div>
        </div>
      </header>

      <motion.div
        className="p-4 sm:p-8 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* KPI Cards */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={containerVariants}>
          {[
            { label: 'Totale OdL', value: total, icon: ClipboardList, iconColor: colors.textPrimary },
            { label: 'Aperti', value: openCount, icon: AlertCircle, iconColor: colors.info },
            { label: 'In Lavorazione', value: inProgressCount, icon: Clock, iconColor: colors.warning },
            { label: 'Completati', value: completedCount, icon: Car, iconColor: colors.success },
          ].map((kpi) => (
            <motion.div
              key={kpi.label}
              className="rounded-2xl border h-[120px] flex flex-col justify-center px-5"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              }}
              variants={itemVariants}
            >
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className="h-4 w-4" style={{ color: kpi.iconColor }} />
                <span className="text-[13px]" style={{ color: colors.textTertiary }}>{kpi.label}</span>
              </div>
              <span
                className="text-[32px] font-light"
                style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
              >
                {isLoading ? '...' : kpi.value}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Status Filter Pills */}
        <motion.div className="flex justify-center flex-wrap gap-2" variants={itemVariants}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className="h-10 px-4 rounded-full text-[13px] font-medium transition-all border"
              style={{
                backgroundColor: statusFilter === opt.value ? colors.textPrimary : 'transparent',
                color: statusFilter === opt.value ? colors.bg : colors.textSecondary,
                borderColor: statusFilter === opt.value ? colors.textPrimary : colors.borderSubtle,
              }}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          className="rounded-2xl border p-4"
          style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
          variants={itemVariants}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.textMuted }} />
            <input
              type="text"
              placeholder="Cerca per numero OdL, cliente, targa..."
              aria-label="Cerca ordini di lavoro"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
              style={{
                backgroundColor: colors.glowStrong,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
              }}
            />
          </div>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <motion.div className="flex items-center justify-center py-20" variants={itemVariants}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.textMuted }} />
          </motion.div>
        ) : error ? (
          <motion.div className="flex flex-col items-center justify-center py-20 text-center" variants={itemVariants}>
            <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-[15px] mb-4" style={{ color: colors.textTertiary }}>
              Impossibile caricare gli ordini di lavoro
            </p>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 rounded-full text-sm border transition-colors hover:bg-white/5"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              Riprova
            </button>
          </motion.div>
        ) : workOrders.length === 0 && !debouncedSearch && !statusFilter ? (
          <motion.div className="flex flex-col items-center justify-center py-20 text-center" variants={itemVariants}>
            <ClipboardList className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-[15px] mb-1" style={{ color: colors.textPrimary }}>
              Nessun ordine di lavoro
            </p>
            <p className="text-[13px] mb-6" style={{ color: colors.textTertiary }}>
              Crea il primo ordine di lavoro per iniziare a gestire le lavorazioni.
            </p>
            <Link href="/dashboard/work-orders/new">
              <button
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
                style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
              >
                + Nuovo Ordine di Lavoro
              </button>
            </Link>
          </motion.div>
        ) : workOrders.length === 0 ? (
          <motion.div className="flex flex-col items-center justify-center py-20 text-center" variants={itemVariants}>
            <Search className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-[15px] mb-1" style={{ color: colors.textPrimary }}>
              Nessun risultato
            </p>
            <p className="text-[13px] mb-6" style={{ color: colors.textTertiary }}>
              Nessun ordine trovato per i filtri selezionati
            </p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
              className="px-4 py-2 rounded-full text-sm border transition-colors hover:bg-white/5"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              Resetta filtri
            </button>
          </motion.div>
        ) : viewMode === 'list' ? (
          <>
            {/* List View */}
            <motion.div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
              variants={itemVariants}
            >
              <motion.div variants={containerVariants}>
                {workOrders.map((wo, idx) => {
                  const status = getStatus(wo.status);
                  const priority = PRIORITY_CONFIG[wo.priority || 'NORMAL'] || PRIORITY_CONFIG.NORMAL;
                  return (
                    <motion.div
                      key={wo.id}
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors group"
                      style={{
                        borderBottom: idx < workOrders.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                      }}
                      variants={itemVariants}
                      onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      {/* Status color bar */}
                      <div
                        className="w-1 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: status.barColor }}
                      />

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[14px] font-semibold" style={{ color: colors.textPrimary }}>
                            {wo.woNumber || `#${wo.id.slice(0, 8)}`}
                          </span>
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${status.barColor}20`,
                              color: status.barColor,
                            }}
                          >
                            {status.label}
                          </span>
                          <span className="text-[11px] font-medium" style={{ color: priority.color }}>
                            {priority.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[13px]" style={{ color: colors.textTertiary }}>
                          {wo.customerName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {wo.customerName}
                            </span>
                          )}
                          {wo.vehiclePlate && (
                            <span className="font-mono font-bold text-[12px]" style={{ color: colors.textSecondary }}>
                              {wo.vehiclePlate}
                            </span>
                          )}
                          {wo.vehicleMake && (
                            <span>{wo.vehicleMake} {wo.vehicleModel || ''}</span>
                          )}
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-4">
                        {wo.technicianName && (
                          <span className="text-[12px] hidden lg:block" style={{ color: colors.textMuted }}>
                            {wo.technicianName}
                          </span>
                        )}
                        <span
                          className="text-[12px] hidden sm:block"
                          style={{ color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatDate(wo.createdAt)}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: colors.textMuted }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          /* Kanban View */
          <motion.div className="flex gap-4 overflow-x-auto pb-4" variants={itemVariants}>
            {KANBAN_COLUMNS.map((colStatus) => {
              const colConfig = getStatus(colStatus);
              const colItems = workOrders.filter((wo) => wo.status === colStatus);
              return (
                <div
                  key={colStatus}
                  className="flex-shrink-0 w-[280px] sm:w-[300px] rounded-2xl border"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  }}
                >
                  {/* Column Header */}
                  <div
                    className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: colors.borderSubtle }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colConfig.barColor }} />
                      <span className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>
                        {colConfig.label}
                      </span>
                    </div>
                    <span
                      className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: colors.glowStrong,
                        color: colors.textTertiary,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {colItems.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
                    {colItems.length === 0 ? (
                      <p className="text-[12px] text-center py-4" style={{ color: colors.textMuted }}>
                        Nessun ordine
                      </p>
                    ) : (
                      colItems.map((wo) => (
                        <KanbanCard
                          key={wo.id}
                          wo={wo}
                          onChangeStatus={handleChangeStatus}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/* --- Kanban Card --- */
function KanbanCard({
  wo,
  onChangeStatus,
}: {
  wo: WorkOrder;
  onChangeStatus: (id: string, status: string) => Promise<void>;
}): React.ReactElement {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  const NEXT_STATUS: Record<string, string> = {
    DRAFT: 'OPEN',
    OPEN: 'IN_PROGRESS',
    IN_PROGRESS: 'QC',
    QC: 'COMPLETED',
    COMPLETED: 'DELIVERED',
  };

  const nextStatus = NEXT_STATUS[wo.status];
  const nextLabel = nextStatus ? STATUS_CONFIG[nextStatus]?.label : null;

  const handleAdvance = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (!nextStatus || transitioning) return;
    setTransitioning(true);
    try {
      await onChangeStatus(wo.id, nextStatus);
    } finally {
      setTransitioning(false);
    }
  };

  const priority = PRIORITY_CONFIG[wo.priority || 'NORMAL'] || PRIORITY_CONFIG.NORMAL;

  return (
    <div
      onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
      className="p-3 rounded-xl border cursor-pointer transition-colors"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.borderSubtle,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = colors.bg; }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold" style={{ color: colors.textPrimary }}>
          {wo.woNumber || `#${wo.id.slice(0, 8)}`}
        </span>
        <span className="text-[10px] font-medium" style={{ color: priority.color }}>
          {priority.label}
        </span>
      </div>

      {wo.customerName && (
        <div className="flex items-center gap-1.5 mb-1">
          <User className="h-3 w-3 flex-shrink-0" style={{ color: colors.textMuted }} />
          <span className="text-[12px] truncate" style={{ color: colors.textSecondary }}>
            {wo.customerName}
          </span>
        </div>
      )}

      {wo.vehiclePlate && (
        <div className="flex items-center gap-1.5 mb-1">
          <Car className="h-3 w-3 flex-shrink-0" style={{ color: colors.textMuted }} />
          <span className="text-[12px] font-mono font-bold" style={{ color: colors.textSecondary }}>
            {wo.vehiclePlate}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-2 text-[11px]" style={{ color: colors.textMuted }}>
        <Clock className="h-3 w-3" />
        {timeAgo(wo.createdAt)}
      </div>

      {nextStatus && nextLabel && (
        <button
          onClick={handleAdvance}
          disabled={transitioning}
          className="mt-3 w-full text-[12px] font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50 min-h-[32px] border"
          style={{
            backgroundColor: 'transparent',
            borderColor: colors.borderSubtle,
            color: colors.textSecondary,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = colors.glowStrong; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          {transitioning ? 'Aggiornamento...' : `Avanza a ${nextLabel}`}
        </button>
      )}
    </div>
  );
}
