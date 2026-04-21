'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Plus,
  Truck,
  AlertCircle,
  X,
  ChevronDown,
  Loader2,
  Eye,
  Filter,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { useSuppliers, useCreateSupplier, useParts } from '@/hooks/useApi';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// =============================================================================
// Animation Variants
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
// Validation
// =============================================================================
const supplierSchema = z.object({
  name: z.string().min(2, 'Il nome del fornitore è obbligatorio'),
  code: z.string().min(1, 'Il codice è obbligatorio'),
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
// Part Type Config (EU Right to Repair 2024/1799)
// =============================================================================
const partTypeConfig: Record<string, { color: string; bg: string; label: string }> = {
  GENUINE: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', label: 'OEM' },
  AFTERMARKET: { color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40', label: 'Aftermarket' },
  REGENERATED: { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', label: 'Rigenerato' },
  USED: { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', label: 'Usato' },
};

// =============================================================================
// Stock Config
// =============================================================================
const stockConfig: Record<string, { color: string; bg: string; label: string }> = {
  available: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/40',
    label: 'Disponibile',
  },
  low: {
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    label: 'Pochi rimasti',
  },
  out: {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/40',
    label: 'Esaurito',
  },
  unknown: {
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-200 dark:bg-gray-700',
    label: 'N/D',
  },
};

function getStockStatus(currentStock?: number | null, minStockLevel?: number | null): string {
  if (currentStock === undefined || currentStock === null) return 'unknown';
  if (currentStock <= 0) return 'out';
  if (minStockLevel && currentStock <= minStockLevel) return 'low';
  return 'available';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
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

  return (
    <AnimatePresence>
      <motion.div
        className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role='dialog'
        aria-modal='true'
        aria-label='Nuovo Fornitore'
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <motion.div
          className='rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-apple-border/20 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)]'
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
              Nuovo Fornitore
            </h2>
            <button
              onClick={onClose}
              className='p-2 rounded-xl transition-colors hover:bg-apple-light-gray/50 dark:hover:bg-white/5'
              aria-label='Chiudi'
            >
              <X className='h-5 w-5 text-apple-gray dark:text-[var(--text-secondary)]' />
            </button>
          </div>

          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <div className='space-y-4'>
              <div>
                <label className='text-footnote mb-1.5 block text-apple-gray dark:text-[var(--text-secondary)]'>
                  Nome fornitore *
                </label>
                <Input
                  {...register('name')}
                  placeholder='Es. Autodoc Italia'
                />
                {errors.name && <p className='text-footnote mt-1 text-apple-red'>{errors.name.message}</p>}
              </div>
              <div>
                <label className='text-footnote mb-1.5 block text-apple-gray dark:text-[var(--text-secondary)]'>
                  Codice *
                </label>
                <Input
                  {...register('code', {
                    onChange: () => setCodeManual(true),
                  })}
                  placeholder='AUTO_GEN'
                  className='font-mono'
                />
                {errors.code && <p className='text-footnote mt-1 text-apple-red'>{errors.code.message}</p>}
              </div>

              <button
                type='button'
                onClick={() => setShowDetails(!showDetails)}
                className='flex items-center gap-2 text-footnote transition-colors hover:opacity-80 text-apple-gray dark:text-[var(--text-secondary)]'
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                />
                Dettagli (opzionale)
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    className='space-y-3'
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <Input
                      {...register('contactName')}
                      placeholder='Contatto'
                    />
                    <div>
                      <Input
                        {...register('email')}
                        placeholder='Email'
                        type='email'
                      />
                      {errors.email && <p className='text-footnote mt-1 text-apple-red'>{errors.email.message}</p>}
                    </div>
                    <div>
                      <Input
                        {...register('phone')}
                        placeholder='Telefono'
                        type='tel'
                      />
                      {errors.phone && <p className='text-footnote mt-1 text-apple-red'>{errors.phone.message}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className='mt-6'>
              <AppleButton
                className='w-full'
                type='submit'
                loading={createSupplier.isPending}
              >
                {createSupplier.isPending ? 'Aggiunta in corso...' : 'Aggiungi fornitore'}
              </AppleButton>
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

  const isLoading = partsQuery.isLoading || suppliersQuery.isLoading;

  const statCards = [
    {
      label: 'Ricambi Totali',
      value: String(totalParts),
      icon: Package,
      color: 'bg-apple-blue',
    },
    {
      label: 'Fornitori',
      value: String(suppliers.length),
      icon: Truck,
      color: 'bg-apple-green',
    },
    {
      label: 'Stock Basso',
      value: String(lowStockCount),
      icon: AlertCircle,
      color: lowStockCount > 0 ? 'bg-apple-orange' : 'bg-apple-green',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Ricambi</h1>
            <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestione ricambi e fornitori
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton
              variant='secondary'
              icon={<Truck className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/parts/orders/new')}
            >
              Ordine Fornitore
            </AppleButton>
            <AppleButton
              icon={<Plus className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/parts/new')}
            >
              Nuovo Ricambio
            </AppleButton>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 space-y-6'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Stats */}
        <motion.div
          className='grid grid-cols-2 lg:grid-cols-3 gap-bento'
          variants={containerVariants}
        >
          {statCards.map(stat => (
            <motion.div key={stat.label} variants={statsCardVariants}>
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className='flex items-center justify-between mb-3'>
                    <div
                      className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}
                    >
                      <stat.icon className='h-5 w-5 text-white' />
                    </div>
                  </div>
                  <p className='text-title-1 font-bold text-apple-dark dark:text-[var(--text-primary)]'>
                    {isLoading ? '...' : stat.value}
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>{stat.label}</p>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray' />
                  <Input
                    placeholder='Cerca per codice OEM, marca o nome ricambio...'
                    aria-label='Cerca ricambi'
                    value={searchInput}
                    onChange={e => handleSearchChange(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <div className='relative'>
                  <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-apple-gray pointer-events-none' />
                  <select
                    value={selectedSupplierId || ''}
                    onChange={e => setSelectedSupplierId(e.target.value || null)}
                    className='h-10 pl-10 pr-4 rounded-md border border-apple-border/30 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-sm text-apple-dark dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                  >
                    <option value=''>Tutti i fornitori</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <AppleButton
                  variant='secondary'
                  icon={<Plus className='h-4 w-4' />}
                  onClick={() => setDialogOpen(true)}
                >
                  Nuovo Fornitore
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Parts List */}
        <motion.div variants={listItemVariants}>
          <AppleCard hover={false}>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Elenco Ricambi
                {debouncedSearch && ` — "${debouncedSearch}"`}
                {!isLoading && <span className='text-apple-gray dark:text-[var(--text-secondary)] font-normal ml-2'>({totalParts})</span>}
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {partsQuery.isError || suppliersQuery.isError ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    Impossibile caricare i ricambi
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => {
                      partsQuery.refetch();
                      suppliersQuery.refetch();
                    }}
                  >
                    Riprova
                  </AppleButton>
                </div>
              ) : isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
                </div>
              ) : parts.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <Package className='h-12 w-12 text-apple-gray/40 mb-4' />
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
                    {debouncedSearch
                      ? `Nessun risultato per "${debouncedSearch}"`
                      : 'Nessun ricambio trovato. Aggiungi il primo ricambio.'}
                  </p>
                  <AppleButton
                    variant='ghost'
                    className='mt-4'
                    onClick={() => router.push('/dashboard/parts/new')}
                  >
                    Aggiungi il primo ricambio
                  </AppleButton>
                </div>
              ) : (
                <motion.div
                  className='space-y-3'
                  variants={containerVariants}
                  initial='hidden'
                  animate='visible'
                >
                  {parts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((part, index) => {
                    const status = getStockStatus(part.currentStock, part.minStockLevel);
                    const stock = stockConfig[status];
                    return (
                      <motion.div
                        key={part.id}
                        className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[var(--surface-hover)] hover:bg-white dark:hover:bg-[var(--surface-active)] hover:shadow-apple transition-all duration-300'
                        variants={listItemVariants}
                        custom={index}
                        whileHover={{ scale: 1.005, x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                            <Package className='h-6 w-6 text-apple-blue' />
                          </div>
                          <div>
                            <div className='flex items-center gap-2 flex-wrap'>
                              <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                                {part.name}
                              </p>
                              <span
                                className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${stock.bg} ${stock.color}`}
                              >
                                {stock.label}
                              </span>
                              {part.partType && partTypeConfig[part.partType] && (
                                <span
                                  className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${partTypeConfig[part.partType].bg} ${partTypeConfig[part.partType].color}`}
                                >
                                  {partTypeConfig[part.partType].label}
                                </span>
                              )}
                            </div>
                            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                              {part.brand && `${part.brand} \u2022 `}
                              Fornitore: {part.supplier?.name || part.supplierName || '\u2014'}
                              {part.partNumber && ` \u2022 OEM: ${part.partNumber}`}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          {part.retailPrice !== undefined && part.retailPrice !== null && (
                            <p className='text-body font-semibold text-apple-dark dark:text-[var(--text-primary)] min-w-[100px] text-right'>
                              {formatCurrency(Number(part.retailPrice))}
                            </p>
                          )}
                          {part.currentStock !== undefined && part.currentStock !== null && (
                            <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] min-w-[60px] text-right'>
                              {part.currentStock} in stock
                            </p>
                          )}
                          <AppleButton
                            variant='ghost'
                            size='sm'
                            icon={<Eye className='h-3.5 w-3.5' />}
                            onClick={() => router.push(`/dashboard/parts/${part.id}`)}
                          >
                            Dettagli
                          </AppleButton>
                        </div>
                      </motion.div>
                    );
                  })}
                  <Pagination page={page} totalPages={Math.ceil(parts.length / PAGE_SIZE)} onPageChange={setPage} />
                </motion.div>
              )}
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </motion.div>

      {/* Add Supplier Dialog */}
      <AddSupplierDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
