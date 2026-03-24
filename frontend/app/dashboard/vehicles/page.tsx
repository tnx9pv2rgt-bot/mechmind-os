'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Car,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Fuel,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatPlate, formatNumber } from '@/lib/utils/format';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  color?: string;
  fuelType?: string;
  mileage?: number;
  status: string;
  customerId?: string;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  createdAt: string;
}

interface VehiclesResponse {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
}

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

const FUEL_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Tutti i carburanti' },
  { value: 'Benzina', label: 'Benzina' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'GPL', label: 'GPL' },
  { value: 'Metano', label: 'Metano' },
  { value: 'Ibrido', label: 'Ibrido' },
  { value: 'Elettrico', label: 'Elettrico' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function VehiclesPage(): React.ReactElement {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fuelFilter, setFuelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const PAGE_SIZE = 20;

  // Debounce search
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
    if (fuelFilter) params.set('fuelType', fuelFilter);
    return `/api/dashboard/vehicles?${params.toString()}`;
  }, [page, debouncedSearch, fuelFilter]);

  const { data: rawData, error, isLoading, mutate } = useSWR<VehiclesResponse | Vehicle[]>(
    buildUrl(),
    fetcher,
  );

  const vehicles: Vehicle[] = (() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if ('data' in rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  })();

  const total = (() => {
    if (!rawData) return 0;
    if (Array.isArray(rawData)) return rawData.length;
    if ('total' in rawData) return rawData.total;
    return vehicles.length;
  })();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/dashboard/vehicles/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Errore durante l\'eliminazione');
      toast.success('Veicolo eliminato', {
        description: `${deleteTarget.make} ${deleteTarget.model} (${formatPlate(deleteTarget.licensePlate)}) rimosso`,
      });
      mutate();
    } catch {
      toast.error('Errore durante l\'eliminazione del veicolo');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const getOwnerName = (vehicle: Vehicle): string => {
    if (!vehicle.customer) return '\u2014';
    return [vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') || '\u2014';
  };

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
              aria-label="Torna alla dashboard"
            >
              <ArrowLeft className="h-5 w-5" style={{ color: colors.textSecondary }} />
            </Link>
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Veicoli
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Gestisci il parco veicoli dei tuoi clienti
              </p>
            </div>
          </div>
          <Link href="/dashboard/vehicles/new">
            <button
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors min-h-[44px]"
              style={{ backgroundColor: colors.accent, color: colors.bg }}
            >
              <Plus className="h-4 w-4" />
              Nuovo Veicolo
            </button>
          </Link>
        </div>
      </header>

      <div className="p-4 sm:p-8 space-y-6">
        {/* Search + Filters */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.textMuted }} />
                <input
                  type="text"
                  placeholder="Cerca per targa, marca, modello..."
                  aria-label="Cerca veicoli"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-xl border text-sm focus:outline-none focus:border-white/30 transition-colors"
                  style={{
                    backgroundColor: colors.glowStrong,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  }}
                />
              </div>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: colors.textMuted }} />
                <select
                  value={fuelFilter}
                  onChange={(e) => { setFuelFilter(e.target.value); setPage(1); }}
                  aria-label="Filtra per carburante"
                  className="h-12 pl-10 pr-8 rounded-xl border text-sm focus:outline-none appearance-none cursor-pointer min-w-[180px] focus:border-white/30 transition-colors"
                  style={{
                    backgroundColor: colors.glowStrong,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  }}
                >
                  {FUEL_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-base font-medium mb-1" style={{ color: colors.textPrimary }}>
              Impossibile caricare i veicoli
            </p>
            <p className="text-sm mb-4" style={{ color: colors.textTertiary }}>
              Si è verificato un errore durante il caricamento. Riprova.
            </p>
            <button
              onClick={() => mutate()}
              className="h-10 px-4 rounded-full text-sm font-medium border transition-colors hover:bg-white/5"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              Riprova
            </button>
          </div>
        ) : vehicles.length === 0 && !debouncedSearch && !fuelFilter ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Car className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-base font-medium mb-1" style={{ color: colors.textPrimary }}>
              Nessun veicolo registrato
            </p>
            <p className="text-sm mb-4" style={{ color: colors.textTertiary }}>
              Aggiungi il primo veicolo per iniziare a gestire il parco auto dei tuoi clienti.
            </p>
            <Link href="/dashboard/vehicles/new">
              <button
                className="h-10 px-4 rounded-full text-sm font-medium transition-colors"
                style={{ backgroundColor: colors.accent, color: colors.bg }}
              >
                + Nuovo Veicolo
              </button>
            </Link>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
            <p className="text-base font-medium mb-1" style={{ color: colors.textPrimary }}>
              Nessun risultato
            </p>
            <p className="text-sm mb-4" style={{ color: colors.textTertiary }}>
              Nessun veicolo trovato per &quot;{debouncedSearch || fuelFilter}&quot;
            </p>
            <button
              onClick={() => { setSearchQuery(''); setFuelFilter(''); }}
              className="h-10 px-4 rounded-full text-sm font-medium border transition-colors hover:bg-white/5"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              Cancella filtri
            </button>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
            {/* Table */}
            <motion.div variants={itemVariants}>
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: colors.borderSubtle }}>
                        <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: colors.textTertiary }}>Targa</th>
                        <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: colors.textTertiary }}>Marca / Modello</th>
                        <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: colors.textTertiary }}>Anno</th>
                        <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: colors.textTertiary }}>Carburante</th>
                        <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: colors.textTertiary }}>Proprietario</th>
                        <th className="text-right px-4 py-3 font-medium text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: colors.textTertiary }}>Km</th>
                        <th className="text-right px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: colors.textTertiary }}>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((vehicle) => (
                        <tr
                          key={vehicle.id}
                          className="border-b last:border-b-0 transition-colors"
                          style={{ borderColor: colors.borderSubtle }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <td className="px-4 py-3">
                            <span
                              className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs tracking-wider"
                              style={{
                                backgroundColor: colors.glowStrong,
                                color: colors.textPrimary,
                              }}
                            >
                              {formatPlate(vehicle.licensePlate)}
                            </span>
                            <span className="block sm:hidden text-xs mt-1" style={{ color: colors.textSecondary }}>
                              {vehicle.make} {vehicle.model}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell" style={{ color: colors.textPrimary }}>
                            {vehicle.make} {vehicle.model}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell" style={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                            {vehicle.year || '\u2014'}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell" style={{ color: colors.textSecondary }}>
                            {vehicle.fuelType || '\u2014'}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {vehicle.customer ? (
                              <Link
                                href={`/dashboard/customers/${vehicle.customer.id}`}
                                className="hover:underline"
                                style={{ color: colors.info }}
                              >
                                {getOwnerName(vehicle)}
                              </Link>
                            ) : (
                              <span style={{ color: colors.textMuted }}>\u2014</span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 text-right hidden lg:table-cell"
                            style={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}
                          >
                            {vehicle.mileage ? formatNumber(vehicle.mileage) : '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                                className="p-2 rounded-lg transition-colors hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label={`Visualizza ${vehicle.licensePlate}`}
                                title="Visualizza"
                              >
                                <Eye className="h-4 w-4" style={{ color: colors.textMuted }} />
                              </button>
                              <button
                                onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}?tab=dettagli&edit=true`)}
                                className="p-2 rounded-lg transition-colors hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label={`Modifica ${vehicle.licensePlate}`}
                                title="Modifica"
                              >
                                <Pencil className="h-4 w-4" style={{ color: colors.textMuted }} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(vehicle)}
                                className="p-2 rounded-lg transition-colors hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label={`Elimina ${vehicle.licensePlate}`}
                                title="Elimina"
                              >
                                <Trash2 className="h-4 w-4" style={{ color: colors.textMuted }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Elimina veicolo"
        description={deleteTarget ? `Sei sicuro di voler eliminare il veicolo ${formatPlate(deleteTarget.licensePlate)} (${deleteTarget.make} ${deleteTarget.model})? L'azione non può essere annullata.` : ''}
        confirmLabel="Elimina"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
