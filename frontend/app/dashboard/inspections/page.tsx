'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ClipboardCheck,
  Search,
  Plus,
  User,
  AlertCircle,
  Filter,
  Trash2,
  Eye,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface InspectionItem {
  id: string;
  plate: string;
  vehicle: string;
  customer: string;
  technician: string;
  type: string;
  status: string;
  date: string;
  itemCount: number;
  maxSeverity: string;
}

const severityConfig: Record<string, { color: string; label: string }> = {
  CRITICO: { color: colors.error, label: 'Critico' },
  ALTO: { color: '#fb923c', label: 'Alto' },
  MEDIO: { color: colors.warning, label: 'Medio' },
  BASSO: { color: colors.info, label: 'Basso' },
  OK: { color: colors.success, label: 'OK' },
};

const typeLabels: Record<string, string> = {
  PRE_PURCHASE: 'Pre-Acquisto',
  PERIODIC: 'Periodica',
  PRE_SALE: 'Pre-Vendita',
  WARRANTY: 'Garanzia',
  ACCIDENT: 'Incidente',
};

type SeverityFilter = 'ALL' | 'CRITICO' | 'ALTO' | 'MEDIO' | 'BASSO' | 'OK';

const severityFilterOptions: { value: SeverityFilter; label: string }[] = [
  { value: 'ALL', label: 'Tutte' },
  { value: 'CRITICO', label: 'Critico' },
  { value: 'ALTO', label: 'Alto' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'BASSO', label: 'Basso' },
  { value: 'OK', label: 'OK' },
];

export default function InspectionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const {
    data: rawData,
    error: inspectionsError,
    isLoading,
    mutate,
  } = useSWR<Record<string, unknown>>('/api/inspections', fetcher);

  const inspections: InspectionItem[] = (() => {
    const data = rawData?.data || rawData || [];
    return Array.isArray(data)
      ? data.map((i: Record<string, unknown>) => ({
          id: (i.id as string) || '',
          plate: (i.vehiclePlate as string) || (i.plate as string) || '',
          vehicle: (i.vehicleName as string) || (i.vehicle as string) || '',
          customer: (i.customerName as string) || (i.customer as string) || '',
          technician: (i.inspectorName as string) || (i.mechanicName as string) || (i.technician as string) || '',
          type: (i.type as string) || (i.inspectionType as string) || '',
          status: (i.status as string) || 'pending',
          date: i.createdAt ? new Date(i.createdAt as string).toLocaleDateString('it-IT') : '',
          itemCount: (i.itemCount as number) || (Array.isArray(i.items) ? (i.items as unknown[]).length : 0),
          maxSeverity: (i.maxSeverity as string) || (i.severity as string) || 'OK',
        }))
      : [];
  })();

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch =
      !searchQuery ||
      inspection.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.technician.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || inspection.maxSeverity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/inspections/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      mutate();
      toast.success('Ispezione eliminata');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore eliminazione');
    } finally {
      setDeleteId(null);
    }
  };

  const statCounts = {
    total: inspections.length,
    critico: inspections.filter(i => i.maxSeverity === 'CRITICO').length,
    alto: inspections.filter(i => i.maxSeverity === 'ALTO').length,
    ok: inspections.filter(i => i.maxSeverity === 'OK').length,
  };

  const kpiCards = [
    { label: 'Totali', value: statCounts.total, color: colors.info },
    { label: 'Critiche', value: statCounts.critico, color: colors.error },
    { label: 'Gravità Alta', value: statCounts.alto, color: '#fb923c' },
    { label: 'Tutto OK', value: statCounts.ok, color: colors.success },
  ];

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
        <div className="px-4 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              aria-label="Torna alla dashboard"
            >
              <ArrowLeft className="h-5 w-5" style={{ color: colors.textSecondary }} />
            </Link>
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Ispezioni
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Gestione ispezioni veicoli
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors"
            style={{ backgroundColor: colors.accent, color: colors.bg }}
            onClick={() => router.push('/dashboard/inspections/new')}
          >
            <Plus className="h-4 w-4" />
            Nuova Ispezione
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-8 space-y-6">
        {/* KPI Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {kpiCards.map(stat => (
            <motion.div key={stat.label} variants={itemVariants}>
              <div
                className="rounded-2xl border h-[120px] flex flex-col justify-center px-5"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stat.color }}
                  />
                  <div>
                    <p
                      className="text-2xl font-light"
                      style={{
                        color: colors.textPrimary,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {isLoading ? '...' : stat.value}
                    </p>
                    <p className="text-[13px]" style={{ color: colors.textTertiary }}>
                      {stat.label}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Search + Filters */}
        <motion.div initial="hidden" animate="visible" variants={itemVariants}>
          <div
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            }}
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.textMuted }} />
                <input
                  type="text"
                  placeholder="Cerca per targa, veicolo, cliente o tecnico..."
                  aria-label="Cerca ispezioni"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-12 h-12 rounded-xl border text-sm focus:outline-none focus:border-white/30 transition-colors"
                  style={{
                    backgroundColor: colors.glowStrong,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  }}
                />
              </div>
              <div className="flex items-center justify-center flex-wrap gap-2">
                {severityFilterOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSeverityFilter(opt.value); setPage(1); }}
                    className="h-10 px-4 rounded-full text-sm font-medium transition-colors border"
                    style={
                      severityFilter === opt.value
                        ? { backgroundColor: colors.accent, color: colors.bg, borderColor: colors.accent }
                        : { backgroundColor: 'transparent', color: colors.textSecondary, borderColor: colors.border }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* List */}
        <motion.div initial="hidden" animate="visible" variants={itemVariants}>
          {inspectionsError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-base font-medium mb-1" style={{ color: colors.textPrimary }}>
                Impossibile caricare le ispezioni
              </p>
              <button
                className="mt-4 h-10 px-4 rounded-full text-sm font-medium border transition-colors hover:bg-white/5"
                style={{ borderColor: colors.border, color: colors.textPrimary }}
                onClick={() => mutate()}
              >
                Riprova
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardCheck className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-base font-medium mb-1" style={{ color: colors.textPrimary }}>
                Nessuna ispezione trovata
              </p>
              <p className="text-sm mb-4 max-w-md" style={{ color: colors.textTertiary }}>
                {searchQuery || severityFilter !== 'ALL'
                  ? 'Nessun risultato. Prova con altri filtri.'
                  : 'Non ci sono ispezioni registrate. Crea una nuova ispezione per iniziare.'}
              </p>
              {!searchQuery && severityFilter === 'ALL' && (
                <button
                  className="h-10 px-4 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-2"
                  style={{ backgroundColor: colors.accent, color: colors.bg }}
                  onClick={() => router.push('/dashboard/inspections/new')}
                >
                  <Plus className="h-4 w-4" />
                  Nuova Ispezione
                </button>
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              }}
            >
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {filteredInspections.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((inspection) => {
                  const sev = severityConfig[inspection.maxSeverity] || severityConfig.OK;
                  return (
                    <motion.div
                      key={inspection.id}
                      variants={itemVariants}
                      className="flex items-center gap-4 px-5 py-4 border-b transition-colors cursor-pointer group"
                      style={{ borderColor: colors.borderSubtle }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      onClick={() => router.push(`/dashboard/inspections/${inspection.id}`)}
                    >
                      {/* Severity bar */}
                      <div
                        className="w-1 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sev.color }}
                      />

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary }}>
                            {inspection.vehicle}
                          </p>
                          <span
                            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: `${sev.color}20`,
                              color: sev.color,
                            }}
                          >
                            {sev.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: colors.textTertiary }}>
                          <span className="font-mono">#{inspection.id.slice(0, 6)}</span>
                          <span>{inspection.plate}</span>
                          <span className="hidden sm:inline">{inspection.customer}</span>
                          {inspection.technician && (
                            <span className="hidden md:inline flex items-center gap-1">
                              <User className="h-3 w-3 inline" />
                              {inspection.technician}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="hidden sm:block text-right">
                          <p className="text-xs" style={{ color: colors.textTertiary }}>
                            {inspection.date}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}
                          >
                            {inspection.itemCount} elementi
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/inspections/${inspection.id}`);
                            }}
                            className="p-2 rounded-lg transition-colors hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Dettagli"
                            title="Dettagli"
                          >
                            <Eye className="h-4 w-4" style={{ color: colors.textMuted }} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(inspection.id);
                            }}
                            className="p-2 rounded-lg transition-colors hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Elimina ispezione"
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" style={{ color: colors.textMuted }} />
                          </button>
                        </div>
                        <ChevronRight
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: colors.textMuted }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="p-4">
                <Pagination
                  page={page}
                  totalPages={Math.ceil(filteredInspections.length / PAGE_SIZE)}
                  onPageChange={setPage}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null); }}
        title="Elimina ispezione"
        description="Sei sicuro di voler eliminare questa ispezione? Questa azione non può essere annullata."
        confirmLabel="Elimina"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
