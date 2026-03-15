'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Search,
  Plus,
  Truck,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import { useSuppliers, useCreateSupplier, useParts } from '@/hooks/useApi';
import { z } from 'zod';

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

type SupplierErrors = Partial<Record<keyof z.infer<typeof supplierSchema>, string>>;

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const partsListContainer = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const partsListItem = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ---------------------------------------------------------------------------
// Stock badge config
// ---------------------------------------------------------------------------
function getStockConfig(currentStock?: number, minStockLevel?: number) {
  if (currentStock === undefined || currentStock === null) {
    return { color: 'bg-gray-400', label: 'N/D', Icon: AlertCircle };
  }
  if (currentStock <= 0) {
    return { color: 'bg-apple-red', label: 'Esaurito', Icon: AlertCircle };
  }
  if (minStockLevel && currentStock <= minStockLevel) {
    return { color: 'bg-apple-orange', label: 'Pochi rimasti', Icon: AlertCircle };
  }
  return { color: 'bg-apple-green', label: 'Disponibile', Icon: CheckCircle };
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------
function ChipSkeleton() {
  return (
    <div className='flex gap-3'>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className='h-9 w-24 rounded-full bg-gray-200 dark:bg-[#353535] animate-pulse'
        />
      ))}
    </div>
  );
}

function PartRowSkeleton() {
  return (
    <div className='flex items-center gap-4 p-5 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] animate-pulse'>
      <div className='w-16 h-16 rounded-2xl bg-gray-200 dark:bg-[#2f2f2f]' />
      <div className='flex-1 space-y-2'>
        <div className='h-4 w-48 bg-gray-200 dark:bg-[#2f2f2f] rounded' />
        <div className='h-3 w-32 bg-gray-200 dark:bg-[#2f2f2f] rounded' />
      </div>
      <div className='h-6 w-16 bg-gray-200 dark:bg-[#2f2f2f] rounded' />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier Dialog
// ---------------------------------------------------------------------------
function AddSupplierDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeManual, setCodeManual] = useState(false);
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [errors, setErrors] = useState<SupplierErrors>({});

  const createSupplier = useCreateSupplier();

  // Auto-generate code from name
  useEffect(() => {
    if (!codeManual && name) {
      setCode(
        name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .slice(0, 20)
      );
    }
  }, [name, codeManual]);

  const handleSubmit = async () => {
    setErrors({});
    const data = {
      name: name.trim(),
      code: code.trim(),
      contactName: contactName || undefined,
      email: email || undefined,
      phone: phone || undefined,
    };
    const result = supplierSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: SupplierErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SupplierErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    await createSupplier.mutateAsync({
      name: name.trim(),
      code: code.trim(),
      ...(contactName && { contactName }),
      ...(email && { email }),
      ...(phone && { phone }),
    });
    setName('');
    setCode('');
    setCodeManual(false);
    setContactName('');
    setEmail('');
    setPhone('');
    setShowDetails(false);
    setErrors({});
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className='bg-white dark:bg-[#2f2f2f] rounded-3xl shadow-2xl w-full max-w-md mx-4 p-6'
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
              Nuovo Fornitore
            </h2>
            <button
              onClick={onClose}
              className='p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#424242]'
            >
              <X className='h-5 w-5 text-apple-gray' />
            </button>
          </div>

          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-1 block'>
                Nome fornitore *
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='Es. Autodoc Italia'
                className='h-11 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#353535] text-gray-900 dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec]'
              />
              {errors.name && <p className='text-xs text-apple-red mt-1'>{errors.name}</p>}
            </div>
            <div>
              <label className='text-sm font-medium text-apple-dark dark:text-[#ececec] mb-1 block'>
                Codice *
              </label>
              <Input
                value={code}
                onChange={e => {
                  setCode(e.target.value);
                  setCodeManual(true);
                }}
                placeholder='AUTO_GEN'
                className='h-11 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#353535] text-gray-900 dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec] font-mono'
              />
              {errors.code && <p className='text-xs text-apple-red mt-1'>{errors.code}</p>}
            </div>

            <button
              type='button'
              onClick={() => setShowDetails(!showDetails)}
              className='flex items-center gap-2 text-sm text-apple-gray hover:text-apple-dark dark:hover:text-[#ececec] transition-colors'
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
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder='Contatto'
                    className='h-11 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#353535] text-gray-900 dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec]'
                  />
                  <div>
                    <Input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder='Email'
                      type='email'
                      className='h-11 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#353535] text-gray-900 dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec]'
                    />
                    {errors.email && <p className='text-xs text-apple-red mt-1'>{errors.email}</p>}
                  </div>
                  <div>
                    <Input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder='Telefono'
                      type='tel'
                      className='h-11 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#353535] text-gray-900 dark:text-[#ececec] focus:border-black dark:focus:border-[#ececec]'
                    />
                    {errors.phone && <p className='text-xs text-apple-red mt-1'>{errors.phone}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className='mt-6'>
            <AppleButton
              className='w-full'
              onClick={handleSubmit}
              disabled={!name.trim() || !code.trim() || createSupplier.isPending}
            >
              {createSupplier.isPending ? 'Aggiunta in corso...' : 'Aggiungi fornitore'}
            </AppleButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function PartsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  // Cleanup debounce on unmount
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
    <div>
      {/* Header */}
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Ricambi</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Gestione ricambi e fornitori
            </p>
          </div>
        </div>
      </header>

      <motion.div
        className='p-8 space-y-6'
        initial='initial'
        animate='animate'
        variants={staggerContainer}
      >
        {/* Stats */}
        <motion.div
          className='grid grid-cols-1 sm:grid-cols-3 gap-bento'
          variants={staggerContainer}
        >
          {[
            {
              label: 'Ricambi totali',
              value: totalParts.toString(),
              icon: Package,
              color: 'bg-apple-blue',
            },
            {
              label: 'Fornitori',
              value: suppliers.length.toString(),
              icon: Truck,
              color: 'bg-apple-green',
            },
            {
              label: 'Stock basso',
              value: lowStockCount.toString(),
              icon: AlertCircle,
              color: lowStockCount > 0 ? 'bg-apple-orange' : 'bg-apple-green',
            },
          ].map(stat => (
            <motion.div key={stat.label} variants={staggerItem}>
              <AppleCard>
                <AppleCardContent className='flex items-center gap-4'>
                  <div
                    className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className='h-6 w-6 text-white' />
                  </div>
                  <div>
                    <p className='text-title-1 font-semibold text-apple-dark dark:text-[#ececec]'>
                      {stat.value}
                    </p>
                    <p className='text-apple-gray dark:text-[#636366] text-sm'>{stat.label}</p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div variants={fadeInUp}>
          <AppleCard>
            <AppleCardContent>
              <div className='relative'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray' />
                <Input
                  placeholder='Cerca per codice OEM, marca o nome ricambio...'
                  value={searchInput}
                  onChange={e => handleSearchChange(e.target.value)}
                  className='pl-12 h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Supplier Chips */}
        <motion.div className='flex flex-wrap gap-3' variants={fadeInUp}>
          {suppliersQuery.isLoading ? (
            <ChipSkeleton />
          ) : (
            <>
              {/* "Tutti" chip */}
              <motion.button
                className={`px-4 py-2 rounded-full border text-footnote transition-colors ${
                  !selectedSupplierId
                    ? 'bg-apple-blue text-white border-apple-blue'
                    : 'bg-white dark:bg-[#2f2f2f] border-apple-border dark:border-[#424242] text-apple-dark dark:text-[#ececec] hover:border-apple-blue hover:text-apple-blue'
                }`}
                onClick={() => setSelectedSupplierId(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Tutti
              </motion.button>

              {/* Dynamic supplier chips */}
              {suppliers.map((supplier, index) => (
                <motion.button
                  key={supplier.id}
                  className={`px-4 py-2 rounded-full border text-footnote transition-colors ${
                    selectedSupplierId === supplier.id
                      ? 'bg-apple-blue text-white border-apple-blue'
                      : 'bg-white dark:bg-[#2f2f2f] border-apple-border dark:border-[#424242] text-apple-dark dark:text-[#ececec] hover:border-apple-blue hover:text-apple-blue'
                  }`}
                  onClick={() =>
                    setSelectedSupplierId(selectedSupplierId === supplier.id ? null : supplier.id)
                  }
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {supplier.name}
                </motion.button>
              ))}

              {/* Add supplier button */}
              <motion.button
                className='px-4 py-2 rounded-full border-2 border-dashed border-apple-border dark:border-[#424242] text-footnote text-apple-gray hover:border-apple-blue hover:text-apple-blue transition-colors flex items-center gap-1'
                onClick={() => setDialogOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className='h-3.5 w-3.5' />
                Nuovo
              </motion.button>
            </>
          )}
        </motion.div>

        {/* Parts List */}
        <motion.div variants={fadeInUp}>
          <AppleCard>
            <AppleCardHeader>
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec]'>
                Risultati{debouncedSearch ? ` per "${debouncedSearch}"` : ''}{' '}
                {!partsQuery.isLoading && (
                  <span className='text-apple-gray font-normal'>({totalParts})</span>
                )}
              </h2>
            </AppleCardHeader>
            <AppleCardContent>
              {partsQuery.isLoading ? (
                <div className='space-y-4'>
                  {[1, 2, 3].map(i => (
                    <PartRowSkeleton key={i} />
                  ))}
                </div>
              ) : parts.length === 0 ? (
                <div className='text-center py-12'>
                  <Package className='h-12 w-12 text-apple-gray/40 mx-auto mb-4' />
                  <p className='text-apple-gray dark:text-[#636366] text-body'>
                    {debouncedSearch
                      ? `Nessun risultato per "${debouncedSearch}"`
                      : 'Nessun ricambio trovato'}
                  </p>
                </div>
              ) : (
                <motion.div
                  className='space-y-4'
                  variants={partsListContainer}
                  initial='initial'
                  animate='animate'
                >
                  {parts.map(part => {
                    const stock = getStockConfig(part.currentStock, part.minStockLevel);

                    return (
                      <motion.div
                        key={part.id}
                        className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] hover:bg-white dark:hover:bg-[#353535] hover:shadow-apple transition-all duration-300'
                        variants={partsListItem}
                        whileHover={{ x: 8, transition: { duration: 0.2 } }}
                      >
                        <div className='flex items-start gap-4'>
                          <motion.div
                            className='w-16 h-16 rounded-2xl bg-white dark:bg-[#2f2f2f] flex items-center justify-center shadow-apple'
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          >
                            <Package className='h-8 w-8 text-apple-gray' />
                          </motion.div>
                          <div>
                            <div className='flex items-center gap-2 mb-1'>
                              <h3 className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                                {part.name}
                              </h3>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${stock.color}`}
                              >
                                {stock.label}
                              </span>
                            </div>
                            <p className='text-footnote text-apple-gray dark:text-[#636366] mb-1'>
                              {part.brand && `Brand: ${part.brand} • `}
                              Fornitore: {part.supplier?.name || part.supplierName || '—'}
                            </p>
                            {part.partNumber && (
                              <p className='text-caption text-apple-gray dark:text-[#636366] font-mono'>
                                OEM: {part.partNumber}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className='flex items-center gap-6'>
                          <div className='text-right'>
                            {part.retailPrice !== undefined && part.retailPrice !== null ? (
                              <>
                                <p className='text-title-3 font-bold text-apple-blue'>
                                  &euro;{Number(part.retailPrice).toFixed(2)}
                                </p>
                                <p className='text-caption text-apple-gray dark:text-[#636366]'>
                                  IVA incl.
                                </p>
                              </>
                            ) : (
                              <p className='text-sm text-apple-gray'>—</p>
                            )}
                          </div>
                          {part.currentStock !== undefined && (
                            <div className='text-right'>
                              <p className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                                {part.currentStock}
                              </p>
                              <p className='text-caption text-apple-gray dark:text-[#636366]'>
                                in stock
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
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
