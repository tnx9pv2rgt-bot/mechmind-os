'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Search,
  Loader2,
  AlertTriangle,
  Users,
  Car,
  Wrench,
  Receipt,
  CalendarDays,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  url: string;
}

interface SearchResponse {
  data?: {
    customers?: SearchResult[];
    vehicles?: SearchResult[];
    workOrders?: SearchResult[];
    invoices?: SearchResult[];
    bookings?: SearchResult[];
  };
  results?: SearchResult[];
  total?: number;
}

const TYPE_CONFIG: Record<string, { icon: typeof Users; label: string; color: string }> = {
  customer: { icon: Users, label: 'Clienti', color: 'bg-[var(--brand)]/10 text-[var(--brand)] dark:bg-[var(--status-info)]/40/30' },
  vehicle: { icon: Car, label: 'Veicoli', color: 'bg-[var(--status-success)]/10 text-[var(--status-success)] dark:bg-[var(--status-success)]/40/30' },
  'work-order': { icon: Wrench, label: 'Ordini di Lavoro', color: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] dark:bg-[var(--status-warning)]/40/30' },
  invoice: { icon: Receipt, label: 'Fatture', color: 'bg-[var(--brand)]/10 text-[var(--brand)] dark:bg-[var(--brand)]/40/30' },
  booking: { icon: CalendarDays, label: 'Prenotazioni', color: 'bg-[var(--brand)]/10 text-[var(--brand)] dark:bg-[var(--status-success)]/30/30' },
  estimate: { icon: FileText, label: 'Preventivi', color: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] dark:bg-[var(--status-warning)]/40/30' },
};

const fetcher = (url: string): Promise<SearchResponse> =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Errore ricerca');
    return res.json() as Promise<SearchResponse>;
  });

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, error } = useSWR<SearchResponse>(
    debouncedQuery.length >= 2 ? `/api/dashboard/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher,
    { onError: () => toast.error('Errore durante la ricerca') }
  );

  // Flatten grouped results or use flat list
  const getResults = useCallback((): SearchResult[] => {
    if (!data) return [];
    if (data.results) return data.results;
    if (data.data) {
      const grouped = data.data;
      const all: SearchResult[] = [];
      if (grouped.customers) all.push(...grouped.customers);
      if (grouped.vehicles) all.push(...grouped.vehicles);
      if (grouped.workOrders) all.push(...grouped.workOrders);
      if (grouped.invoices) all.push(...grouped.invoices);
      if (grouped.bookings) all.push(...grouped.bookings);
      return all;
    }
    return [];
  }, [data]);

  const results = getResults();

  // Group by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const type = r.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {});

  return (
    <div className='min-h-screen'>
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Ricerca</h1>
          <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
            Cerca in tutto il sistema
          </p>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-4xl mx-auto space-y-6'>
        {/* Search Input */}
        <div className='relative'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
          <Input
            type='search'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Cerca clienti, veicoli, ordini, fatture...'
            className='pl-12 h-14 rounded-2xl text-title-3 border-[var(--border-default)]/50 dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)]'
            aria-label='Ricerca globale'
            autoFocus
          />
          {isLoading && (
            <Loader2 className='absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-[var(--brand)]' />
          )}
        </div>

        {/* Error */}
        {error && debouncedQuery.length >= 2 && (
          <AppleCard>
            <AppleCardContent className='text-center py-8'>
              <AlertTriangle className='w-10 h-10 text-[var(--status-error)]/60 mx-auto mb-3' />
              <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                Errore durante la ricerca. Riprova.
              </p>
            </AppleCardContent>
          </AppleCard>
        )}

        {/* Results */}
        {debouncedQuery.length >= 2 && !isLoading && !error && (
          <>
            {results.length > 0 ? (
              <div className='space-y-6'>
                {Object.entries(groupedResults).map(([type, items]) => {
                  const config = TYPE_CONFIG[type] || { icon: FileText, label: type, color: 'bg-[var(--surface-secondary)] text-[var(--text-tertiary)]' };
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h3 className='text-title-3 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3 flex items-center gap-2'>
                        <Icon className='w-5 h-5' />
                        {config.label}
                        <Badge variant='outline' className='ml-2'>{items.length}</Badge>
                      </h3>
                      <AppleCard>
                        <AppleCardContent className='p-0'>
                          {items.map((result, index) => (
                            <motion.button
                              key={result.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.03 }}
                              onClick={() => router.push(result.url)}
                              className='w-full flex items-center justify-between p-4 hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[var(--surface-hover)] transition-colors text-left border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)]/30 last:border-b-0 min-h-[44px]'
                            >
                              <div className='flex items-center gap-3 min-w-0'>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                                  <Icon className='w-4 h-4' />
                                </div>
                                <div className='min-w-0'>
                                  <p className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate'>
                                    {result.title}
                                  </p>
                                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] truncate'>
                                    {result.subtitle}
                                  </p>
                                </div>
                              </div>
                              <ArrowRight className='w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 ml-2' />
                            </motion.button>
                          ))}
                        </AppleCardContent>
                      </AppleCard>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <AppleCard>
                <AppleCardContent className='text-center py-12'>
                  <Search className='w-12 h-12 text-[var(--text-tertiary)]/30 mx-auto mb-4' />
                  <h3 className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1'>
                    Nessun risultato per &ldquo;{debouncedQuery}&rdquo;
                  </h3>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Prova con termini di ricerca diversi.
                  </p>
                </AppleCardContent>
              </AppleCard>
            )}
          </>
        )}

        {/* Initial state */}
        {debouncedQuery.length < 2 && !isLoading && (
          <AppleCard>
            <AppleCardContent className='text-center py-12'>
              <Search className='w-12 h-12 text-[var(--text-tertiary)]/30 mx-auto mb-4' />
              <h3 className='text-body font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1'>
                Inizia a digitare per cercare
              </h3>
              <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                Cerca clienti, veicoli, ordini di lavoro, fatture e prenotazioni.
              </p>
            </AppleCardContent>
          </AppleCard>
        )}
      </div>
    </div>
  );
}
