'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Search,
  Package,
  ShoppingCart,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  Car,
  Tag,
  RefreshCw,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { EmptyState } from '@/components/patterns/empty-state';
import { ErrorState } from '@/components/patterns/error-state';

// =============================================================================
// Animations
// =============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

// =============================================================================
// Types
// =============================================================================
interface PartSupplier {
  supplierId: string;
  supplierName: string;
  price: number;
  availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ON_ORDER';
  deliveryDays: number;
}

interface CatalogPart {
  id: string;
  name: string;
  oemNumber: string;
  brand?: string;
  category?: string;
  compatible: boolean;
  imageUrl?: string;
  suppliers: PartSupplier[];
}

interface CatalogSearchResponse {
  data: CatalogPart[];
  meta?: { total: number };
}

// =============================================================================
// Availability Config
// =============================================================================
const availabilityConfig: Record<string, { label: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  IN_STOCK: { label: 'Disponibile', colorClass: 'text-[var(--status-success)]', icon: CheckCircle2 },
  LOW_STOCK: { label: 'Pochi rimasti', colorClass: 'text-[var(--status-warning)]', icon: Clock },
  OUT_OF_STOCK: { label: 'Esaurito', colorClass: 'text-[var(--status-error)]', icon: XCircle },
  ON_ORDER: { label: 'In ordine', colorClass: 'text-[var(--brand)]', icon: Truck },
};

// =============================================================================
// Input class
// =============================================================================
const inputClassName = 'w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] border-[var(--border-default)]/30 dark:border-[var(--border-default)]/50 text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50 dark:placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-[var(--brand)] transition-colors';

// =============================================================================
// Main Page
// =============================================================================
export default function PartsCatalogPage(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const [orderingIds, setOrderingIds] = useState<Set<string>>(new Set());

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set('q', searchQuery);
  if (vehicleFilter) queryParams.set('vehicle', vehicleFilter);
  if (inStockOnly) queryParams.set('inStock', 'true');
  if (priceMin) queryParams.set('priceMin', priceMin);
  if (priceMax) queryParams.set('priceMax', priceMax);
  if (brandFilter) queryParams.set('brand', brandFilter);
  const qs = queryParams.toString();

  const shouldFetch = searchQuery.length >= 2;
  const { data, error, isLoading } = useSWR<CatalogSearchResponse>(
    shouldFetch ? `/api/parts-catalog/search?${qs}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const parts = data?.data ?? [];

  const handleOrder = useCallback(async (partId: string, supplierId: string, supplierName: string) => {
    const key = `${partId}-${supplierId}`;
    setOrderingIds(prev => new Set(prev).add(key));
    try {
      const res = await fetch('/api/parts-catalog/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'order', partId, supplierId }),
      });
      if (!res.ok) throw new Error('Errore ordine');
      toast.success(`Ordine inviato a ${supplierName}`);
    } catch {
      toast.error('Errore durante l\'invio dell\'ordine');
    } finally {
      setOrderingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  return (
    <div>
      {/* Header */}
      <header className="">
        <div className="px-8 py-5">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/parts">
              <AppleButton variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
                Indietro
              </AppleButton>
            </Link>
            <div>
              <h1 className="text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]">Catalogo Ricambi Multi-Fornitore</h1>
              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1">Cerca e confronta ricambi da pi&ugrave; fornitori</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-7xl mx-auto space-y-6">
          {/* Search Bar */}
          <motion.div variants={itemVariants}>
            <AppleCard hover={false}>
              <AppleCardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Cerca per nome ricambio, codice OEM..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className={`${inputClassName} pl-10`}
                    />
                  </div>
                  <div className="relative sm:w-64">
                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Veicolo (marca/modello/targa)"
                      value={vehicleFilter}
                      onChange={e => setVehicleFilter(e.target.value)}
                      className={`${inputClassName} pl-10`}
                    />
                  </div>
                  <AppleButton
                    variant={showFilters ? 'secondary' : 'ghost'}
                    size="md"
                    icon={<SlidersHorizontal className="h-4 w-4" />}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    Filtri
                  </AppleButton>
                </div>

                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] border border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50"
                  >
                    <label className="flex items-center gap-2 text-footnote min-h-[44px] cursor-pointer text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={e => setInStockOnly(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      Solo disponibili
                    </label>
                    <div className="flex-1">
                      <label className="text-footnote font-medium mb-1 block text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Prezzo min</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={priceMin}
                        onChange={e => setPriceMin(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-footnote font-medium mb-1 block text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Prezzo max</label>
                      <input
                        type="number"
                        placeholder="1000"
                        value={priceMax}
                        onChange={e => setPriceMax(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-footnote font-medium mb-1 block text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Marca</label>
                      <input
                        type="text"
                        placeholder="Es. Bosch, Brembo..."
                        value={brandFilter}
                        onChange={e => setBrandFilter(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div className="flex items-end">
                      <AppleButton
                        variant="ghost"
                        size="sm"
                        icon={<X className="h-3 w-3" />}
                        onClick={() => { setInStockOnly(false); setPriceMin(''); setPriceMax(''); setBrandFilter(''); }}
                      >
                        Pulisci
                      </AppleButton>
                    </div>
                  </motion.div>
                )}
              </AppleCardContent>
            </AppleCard>
          </motion.div>

          {/* Results */}
          <motion.div variants={itemVariants}>
            {!shouldFetch ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
                      <Search className="w-6 h-6 text-[var(--brand)]" />
                    </div>
                    <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Inserisci almeno 2 caratteri per cercare</p>
                    <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Cerca per nome ricambio, codice OEM o marca</p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
              </div>
            ) : error ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--status-error)]/10 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-[var(--status-error)]" />
                    </div>
                    <p className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Errore nella ricerca</p>
                    <AppleButton
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw className="h-4 w-4" />}
                      onClick={() => window.location.reload()}
                    >
                      Riprova
                    </AppleButton>
                  </div>
                </AppleCardContent>
              </AppleCard>
            ) : parts.length === 0 ? (
              <AppleCard hover={false}>
                <AppleCardContent>
                  <EmptyState
                    icon={Package}
                    title="Nessun ricambio trovato"
                    description="Prova a modificare i termini di ricerca"
                  />
                </AppleCardContent>
              </AppleCard>
            ) : (
              <div className="space-y-4">
                <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{data?.meta?.total ?? parts.length} risultati trovati</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {parts.map(part => {
                    const isExpanded = expandedPart === part.id;
                    const bestPrice = part.suppliers.length > 0 ? Math.min(...part.suppliers.map(s => s.price)) : null;
                    return (
                      <AppleCard key={part.id} hover>
                        {/* Part Header */}
                        <AppleCardContent>
                          <div className="flex items-start gap-3">
                            <div className="w-16 h-16 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] flex items-center justify-center flex-shrink-0">
                              <Package className="w-6 h-6 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-body font-semibold truncate text-[var(--text-primary)] dark:text-[var(--text-primary)]">{part.name}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-footnote px-1.5 py-0.5 rounded-lg bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                  OEM: {part.oemNumber}
                                </span>
                                {part.brand && (
                                  <span className="text-footnote flex items-center gap-1 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                    <Tag className="w-3 h-3" /> {part.brand}
                                  </span>
                                )}
                              </div>
                              {part.compatible && (
                                <span className="inline-flex items-center gap-1 mt-2 text-footnote px-2 py-0.5 rounded-full bg-[var(--status-success-subtle)]/60 dark:bg-[var(--status-success-subtle)] text-[var(--status-success)]">
                                  <CheckCircle2 className="w-3 h-3" /> Compatibile
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                            <div>
                              {bestPrice !== null && (
                                <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                  Da <span className="font-bold text-body text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                    {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(bestPrice)}
                                  </span>
                                </p>
                              )}
                              <p className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{part.suppliers.length} fornitor{part.suppliers.length === 1 ? 'e' : 'i'}</p>
                            </div>
                            <AppleButton
                              variant="ghost"
                              size="sm"
                              icon={<ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                              onClick={() => setExpandedPart(isExpanded ? null : part.id)}
                            >
                              Confronta prezzi
                            </AppleButton>
                          </div>
                        </AppleCardContent>

                        {/* Supplier Comparison */}
                        {isExpanded && part.suppliers.length > 0 && (
                          <div className="border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50">
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Fornitore</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Prezzo</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Disponibilit&agrave;</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Tempi</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Azione</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {part.suppliers
                                    .sort((a, b) => a.price - b.price)
                                    .map((supplier, idx) => {
                                      const avail = availabilityConfig[supplier.availability] ?? availabilityConfig.OUT_OF_STOCK;
                                      const AvailIcon = avail.icon;
                                      const orderKey = `${part.id}-${supplier.supplierId}`;
                                      return (
                                        <tr
                                          key={supplier.supplierId}
                                          className={idx < part.suppliers.length - 1 ? 'border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50' : ''}
                                        >
                                          <td className="px-4 py-2.5">
                                            <span className="text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{supplier.supplierName}</span>
                                            {idx === 0 && (
                                              <span className="ml-2 text-footnote px-1.5 py-0.5 rounded-full bg-[var(--status-success-subtle)]/60 dark:bg-[var(--status-success-subtle)] text-[var(--status-success)]">
                                                Miglior prezzo
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">
                                            <span className="text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                              {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(supplier.price)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-center">
                                            <span className={`inline-flex items-center gap-1 text-footnote ${avail.colorClass}`}>
                                              <AvailIcon className="w-3 h-3" /> {avail.label}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-center">
                                            <span className="text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                              {supplier.deliveryDays === 0 ? 'Immediato' : `${supplier.deliveryDays} gg`}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-right">
                                            <AppleButton
                                              variant="primary"
                                              size="sm"
                                              icon={orderingIds.has(orderKey) ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                                              onClick={() => handleOrder(part.id, supplier.supplierId, supplier.supplierName)}
                                              disabled={orderingIds.has(orderKey) || supplier.availability === 'OUT_OF_STOCK'}
                                            >
                                              Ordina
                                            </AppleButton>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </AppleCard>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
