'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Input } from '@/components/ui/input';
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
  Filter,
  Loader2,
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
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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
    <div>
      {/* Header */}
      <header>
        <div className="px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-headline text-apple-dark dark:text-[var(--text-primary)]">Veicoli</h1>
            <p className="text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1">
              Gestisci il parco veicoli dei tuoi clienti
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/vehicles/new">
              <AppleButton variant="primary" icon={<Plus className="h-4 w-4" />}>
                Nuovo Veicolo
              </AppleButton>
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
        {/* Search + Filters */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray" />
                  <Input
                    type="text"
                    placeholder="Cerca per targa, marca, modello..."
                    aria-label="Cerca veicoli"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray pointer-events-none" />
                  <select
                    value={fuelFilter}
                    onChange={(e) => { setFuelFilter(e.target.value); setPage(1); }}
                    aria-label="Filtra per carburante"
                    className="h-10 pl-10 pr-4 rounded-md border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none appearance-none cursor-pointer min-w-[180px]"
                  >
                    {FUEL_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Content */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]">
                Elenco Veicoli
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-apple-red/40 mb-4" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                    Impossibile caricare i veicoli
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    onClick={() => mutate()}
                  >
                    Riprova
                  </AppleButton>
                </div>
              ) : vehicles.length === 0 && !debouncedSearch && !fuelFilter ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Car className="h-12 w-12 text-apple-gray/40 mb-4" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                    Nessun veicolo registrato. Aggiungi il primo veicolo per iniziare.
                  </p>
                  <Link href="/dashboard/vehicles/new">
                    <AppleButton variant="ghost" className="mt-4">
                      Nuovo Veicolo
                    </AppleButton>
                  </Link>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-apple-gray/40 mb-4" />
                  <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">
                    Nessun veicolo trovato per &quot;{debouncedSearch || fuelFilter}&quot;
                  </p>
                  <AppleButton
                    variant="ghost"
                    className="mt-4"
                    onClick={() => { setSearchQuery(''); setFuelFilter(''); }}
                  >
                    Cancella filtri
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className="space-y-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-apple-border/20 dark:border-[var(--border-default)]">
                          <th className="text-left px-4 py-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Targa</th>
                          <th className="text-left px-4 py-3 text-xs font-medium hidden sm:table-cell text-apple-dark dark:text-[var(--text-primary)]">Marca / Modello</th>
                          <th className="text-left px-4 py-3 text-xs font-medium hidden md:table-cell text-apple-dark dark:text-[var(--text-primary)]">Anno</th>
                          <th className="text-left px-4 py-3 text-xs font-medium hidden lg:table-cell text-apple-dark dark:text-[var(--text-primary)]">Carburante</th>
                          <th className="text-left px-4 py-3 text-xs font-medium hidden md:table-cell text-apple-dark dark:text-[var(--text-primary)]">Proprietario</th>
                          <th className="text-right px-4 py-3 text-xs font-medium hidden lg:table-cell text-apple-dark dark:text-[var(--text-primary)]">Km</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.map((vehicle) => (
                          <motion.tr
                            key={vehicle.id}
                            variants={listItemVariants}
                            className="border-b border-apple-border/10 dark:border-[var(--border-default)] last:border-b-0 transition-colors hover:bg-apple-light-gray/30 dark:hover:bg-[var(--surface-active)]"
                          >
                            <td className="px-4 py-3">
                              <span className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs tracking-wider bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] text-apple-dark dark:text-[var(--text-primary)]">
                                {formatPlate(vehicle.licensePlate)}
                              </span>
                              <span className="block sm:hidden text-footnote mt-1 text-apple-gray dark:text-[var(--text-secondary)]">
                                {vehicle.make} {vehicle.model}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-body text-apple-dark dark:text-[var(--text-primary)]">
                              {vehicle.make} {vehicle.model}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-body text-apple-gray dark:text-[var(--text-secondary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {vehicle.year || '\u2014'}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-body text-apple-gray dark:text-[var(--text-secondary)]">
                              {vehicle.fuelType || '\u2014'}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {vehicle.customer ? (
                                <Link
                                  href={`/dashboard/customers/${vehicle.customer.id}`}
                                  className="text-body text-apple-blue hover:underline"
                                >
                                  {getOwnerName(vehicle)}
                                </Link>
                              ) : (
                                <span className="text-body text-apple-gray dark:text-[var(--text-secondary)]">{'\u2014'}</span>
                              )}
                            </td>
                            <td
                              className="px-4 py-3 text-right hidden lg:table-cell text-body text-apple-gray dark:text-[var(--text-secondary)]"
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {vehicle.mileage ? formatNumber(vehicle.mileage) : '\u2014'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <AppleButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                                  aria-label={`Visualizza ${vehicle.licensePlate}`}
                                  icon={<Eye className="h-3.5 w-3.5" />}
                                />
                                <AppleButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}?tab=dettagli&edit=true`)}
                                  aria-label={`Modifica ${vehicle.licensePlate}`}
                                  icon={<Pencil className="h-3.5 w-3.5" />}
                                />
                                <AppleButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(vehicle)}
                                  aria-label={`Elimina ${vehicle.licensePlate}`}
                                  icon={<Trash2 className="h-3.5 w-3.5" />}
                                />
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>

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
