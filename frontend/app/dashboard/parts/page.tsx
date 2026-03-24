'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Package,
  Search,
  Plus,
  Truck,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useSuppliers, useCreateSupplier, useParts } from '@/hooks/useApi';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
// Validation
// =============================================================================
const supplierSchema = z.object({
  name: z.string().min(2, 'Il nome del fornitore \u00e8 obbligatorio'),
  code: z.string().min(1, 'Il codice \u00e8 obbligatorio'),
  contactName: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Formato email non valido'),
  phone: z
    .string()
    .optional()
    .refine(v => !v || v.length >= 6, 'Numero di telefono non valido'),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

// =============================================================================
// Stock Config
// =============================================================================
function getStockConfig(currentStock?: number, minStockLevel?: number) {
  if (currentStock === undefined || currentStock === null) {
    return { color: colors.textMuted, label: 'N/D' };
  }
  if (currentStock <= 0) {
    return { color: colors.error, label: 'Esaurito' };
  }
  if (minStockLevel && currentStock <= minStockLevel) {
    return { color: colors.warning, label: 'Pochi rimasti' };
  }
  return { color: colors.success, label: 'Disponibile' };
}

// =============================================================================
// Skeleton Components
// =============================================================================
function ChipSkeleton() {
  return (
    <div className="flex gap-3">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="h-10 w-24 rounded-full animate-pulse"
          style={{ backgroundColor: colors.surfaceHover }}
        />
      ))}
    </div>
  );
}

function PartRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 p-5 rounded-xl animate-pulse"
      style={{ backgroundColor: colors.surfaceHover }}
    >
      <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: colors.surface }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded" style={{ backgroundColor: colors.surface }} />
        <div className="h-3 w-32 rounded" style={{ backgroundColor: colors.surface }} />
      </div>
      <div className="h-6 w-16 rounded" style={{ backgroundColor: colors.surface }} />
    </div>
  );
}

// =============================================================================
// Supplier Dialog
// =============================================================================
function AddSupplierDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [codeManual, setCodeManual] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const createSupplier = useCreateSupplier();

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      code: '',
      contactName: '',
      email: '',
      phone: '',
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (!codeManual && nameValue) {
      setValue(
        'code',
        nameValue
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .slice(0, 20)
      );
    }
  }, [nameValue, codeManual, setValue]);

  const onSubmit = async (data: SupplierFormData) => {
    try {
      await createSupplier.mutateAsync({
        name: data.name.trim(),
        code: data.code.trim(),
        ...(data.contactName && { contactName: data.contactName }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
      });
      toast.success('Fornitore aggiunto con successo');
    } catch {
      toast.error('Errore durante la creazione del fornitore');
      return;
    }
    reset();
    setCodeManual(false);
    setShowDetails(false);
    onClose();
  };

  if (!open) return null;

  const inputStyle = {
    backgroundColor: colors.glowStrong,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: colors.borderSubtle,
    color: colors.textPrimary,
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Nuovo Fornitore"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <motion.div
          className="rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-light" style={{ color: colors.textPrimary }}>
              Nuovo Fornitore
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" style={{ color: colors.textTertiary }} />
            </button>
          </div>

          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                  Nome fornitore *
                </label>
                <input
                  {...register('name')}
                  placeholder="Es. Autodoc Italia"
                  className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                  style={inputStyle}
                />
                {errors.name && <p className="text-xs mt-1" style={{ color: colors.error }}>{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-[13px] mb-1.5 block" style={{ color: colors.textTertiary }}>
                  Codice *
                </label>
                <input
                  {...register('code', {
                    onChange: () => setCodeManual(true),
                  })}
                  placeholder="AUTO_GEN"
                  className="w-full h-11 px-3 rounded-xl text-sm font-mono focus:outline-none focus:border-white/30 transition-colors"
                  style={inputStyle}
                />
                {errors.code && <p className="text-xs mt-1" style={{ color: colors.error }}>{errors.code.message}</p>}
              </div>

              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-[13px] transition-colors hover:opacity-80"
                style={{ color: colors.textTertiary }}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                />
                Dettagli (opzionale)
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    className="space-y-3"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <input
                      {...register('contactName')}
                      placeholder="Contatto"
                      className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                      style={inputStyle}
                    />
                    <div>
                      <input
                        {...register('email')}
                        placeholder="Email"
                        type="email"
                        className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                        style={inputStyle}
                      />
                      {errors.email && <p className="text-xs mt-1" style={{ color: colors.error }}>{errors.email.message}</p>}
                    </div>
                    <div>
                      <input
                        {...register('phone')}
                        placeholder="Telefono"
                        type="tel"
                        className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none focus:border-white/30 transition-colors"
                        style={inputStyle}
                      />
                      {errors.phone && <p className="text-xs mt-1" style={{ color: colors.error }}>{errors.phone.message}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-6">
              <button
                className="w-full py-3 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                type="submit"
                disabled={createSupplier.isPending}
                style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
              >
                {createSupplier.isPending ? 'Aggiunta in corso...' : 'Aggiungi fornitore'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// Main Page
// =============================================================================
export default function PartsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const suppliersQuery = useSuppliers();
  const partsQuery = useParts({
    search: debouncedSearch || undefined,
    supplierId: selectedSupplierId || undefined,
  });

  const suppliers = suppliersQuery.data || [];
  const parts = partsQuery.data?.data || [];
  const totalParts = partsQuery.data?.total || 0;
  const lowStockCount = parts.filter(p => {
    if (p.currentStock === undefined || p.currentStock === null) return false;
    return p.minStockLevel ? p.currentStock <= p.minStockLevel : p.currentStock <= 0;
  }).length;

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
              style={{ color: colors.textTertiary }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <div>
              <h1 className="text-[28px] font-light" style={{ color: colors.textPrimary }}>
                Ricambi
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: colors.textTertiary }}>
                Gestione ricambi e fornitori
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/parts/orders/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px] border hover:bg-white/5"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Ordine Fornitore</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/parts/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full transition-colors min-h-[44px]"
              style={{ backgroundColor: colors.textPrimary, color: colors.bg }}
            >
              <Plus className="h-4 w-4" />
              Nuovo Ricambio
            </button>
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
        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={containerVariants}>
          {[
            { label: 'Ricambi totali', value: totalParts.toString(), icon: Package, iconColor: colors.info },
            { label: 'Fornitori', value: suppliers.length.toString(), icon: Truck, iconColor: colors.success },
            {
              label: 'Stock basso',
              value: lowStockCount.toString(),
              icon: AlertCircle,
              iconColor: lowStockCount > 0 ? colors.warning : colors.success,
            },
          ].map(stat => (
            <motion.div
              key={stat.label}
              className="rounded-2xl border h-[120px] flex flex-col justify-center px-5"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              }}
              variants={itemVariants}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4" style={{ color: stat.iconColor }} />
                <span className="text-[13px]" style={{ color: colors.textTertiary }}>{stat.label}</span>
              </div>
              <span
                className="text-[32px] font-light"
                style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
              >
                {partsQuery.isLoading ? '...' : stat.value}
              </span>
            </motion.div>
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
              placeholder="Cerca per codice OEM, marca o nome ricambio..."
              aria-label="Cerca ricambi"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
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

        {/* Supplier Filter Pills */}
        <motion.div className="flex justify-center flex-wrap gap-2" variants={itemVariants}>
          {suppliersQuery.isLoading ? (
            <ChipSkeleton />
          ) : (
            <>
              <button
                className="h-10 px-4 rounded-full text-[13px] font-medium transition-all border"
                style={{
                  backgroundColor: !selectedSupplierId ? colors.textPrimary : 'transparent',
                  color: !selectedSupplierId ? colors.bg : colors.textSecondary,
                  borderColor: !selectedSupplierId ? colors.textPrimary : colors.borderSubtle,
                }}
                onClick={() => setSelectedSupplierId(null)}
              >
                Tutti
              </button>

              {suppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  className="h-10 px-4 rounded-full text-[13px] font-medium transition-all border"
                  style={{
                    backgroundColor: selectedSupplierId === supplier.id ? colors.textPrimary : 'transparent',
                    color: selectedSupplierId === supplier.id ? colors.bg : colors.textSecondary,
                    borderColor: selectedSupplierId === supplier.id ? colors.textPrimary : colors.borderSubtle,
                  }}
                  onClick={() =>
                    setSelectedSupplierId(selectedSupplierId === supplier.id ? null : supplier.id)
                  }
                >
                  {supplier.name}
                </button>
              ))}

              <button
                className="h-10 px-4 rounded-full text-[13px] font-medium transition-all border-2 border-dashed flex items-center gap-1 hover:bg-white/5"
                style={{
                  borderColor: colors.borderSubtle,
                  color: colors.textTertiary,
                }}
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Nuovo
              </button>
            </>
          )}
        </motion.div>

        {/* Parts List */}
        <motion.div variants={itemVariants}>
          {/* Title */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-light" style={{ color: colors.textPrimary }}>
              Risultati{debouncedSearch ? ` per "${debouncedSearch}"` : ''}
              {!partsQuery.isLoading && (
                <span className="ml-2" style={{ color: colors.textMuted }}>({totalParts})</span>
              )}
            </h2>
          </div>

          {partsQuery.isError || suppliersQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-4" style={{ color: colors.textTertiary }}>
                Impossibile caricare i ricambi
              </p>
              <button
                onClick={() => { partsQuery.refetch(); suppliersQuery.refetch(); }}
                className="px-4 py-2 rounded-full text-sm border transition-colors hover:bg-white/5"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                Riprova
              </button>
            </div>
          ) : partsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <PartRowSkeleton key={i} />
              ))}
            </div>
          ) : parts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="h-12 w-12 mb-4" style={{ color: colors.borderSubtle }} />
              <p className="text-[15px] mb-1" style={{ color: colors.textPrimary }}>
                {debouncedSearch
                  ? `Nessun risultato per "${debouncedSearch}"`
                  : 'Nessun ricambio trovato'}
              </p>
              <p className="text-[13px]" style={{ color: colors.textTertiary }}>
                {debouncedSearch
                  ? 'Prova a modificare la ricerca'
                  : 'Aggiungi il primo ricambio per iniziare'}
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
            >
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                {parts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((part, idx, arr) => {
                  const stock = getStockConfig(part.currentStock, part.minStockLevel);

                  return (
                    <motion.div
                      key={part.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 cursor-pointer transition-colors group"
                      style={{
                        borderBottom: idx < arr.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                      }}
                      variants={itemVariants}
                      onClick={() => router.push(`/dashboard/parts/${part.id}`)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = colors.surfaceHover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') router.push(`/dashboard/parts/${part.id}`); }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: colors.glowStrong }}
                        >
                          <Package className="h-6 w-6" style={{ color: colors.textTertiary }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[14px] font-semibold" style={{ color: colors.textPrimary }}>
                              {part.name}
                            </h3>
                            <span
                              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${stock.color}20`,
                                color: stock.color,
                              }}
                            >
                              {stock.label}
                            </span>
                          </div>
                          <p className="text-[13px] mb-0.5" style={{ color: colors.textTertiary }}>
                            {part.brand && `Brand: ${part.brand} \u2022 `}
                            Fornitore: {part.supplier?.name || part.supplierName || '\u2014'}
                          </p>
                          {part.partNumber && (
                            <p className="text-[12px] font-mono" style={{ color: colors.textMuted }}>
                              OEM: {part.partNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          {part.retailPrice !== undefined && part.retailPrice !== null ? (
                            <>
                              <p
                                className="text-[16px] font-semibold"
                                style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                              >
                                &euro;{Number(part.retailPrice).toFixed(2)}
                              </p>
                              <p className="text-[11px]" style={{ color: colors.textMuted }}>
                                IVA incl.
                              </p>
                            </>
                          ) : (
                            <p className="text-[13px]" style={{ color: colors.textMuted }}>&mdash;</p>
                          )}
                        </div>
                        {part.currentStock !== undefined && (
                          <div className="text-right">
                            <p
                              className="text-[14px] font-medium"
                              style={{ color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                            >
                              {part.currentStock}
                            </p>
                            <p className="text-[11px]" style={{ color: colors.textMuted }}>
                              in stock
                            </p>
                          </div>
                        )}
                        <ChevronRight
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: colors.textMuted }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
              <div className="px-5 py-3" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
                <Pagination page={page} totalPages={Math.ceil(parts.length / PAGE_SIZE)} onPageChange={setPage} />
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Add Supplier Dialog */}
      <AddSupplierDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
