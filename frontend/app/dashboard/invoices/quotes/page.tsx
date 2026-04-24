'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Send,
  FileCheck,
  FileX,
  MoreHorizontal,
  AlertCircle,
  ArrowLeft,
  FileClock,
  Loader2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

// Types
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface Quote {
  id: string;
  number: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  vehicle?: {
    make: string;
    model: string;
    licensePlate: string;
  };
  date: string;
  expiryDate: string;
  amount: number;
  status: QuoteStatus;
  items: QuoteItem[];
  notes?: string;
  validForDays: number;
  convertedToInvoiceId?: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  type: 'service' | 'parts' | 'labor';
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

// API response types from backend Estimate model
interface EstimateLineResponse {
  id: string;
  type: 'LABOR' | 'PART' | 'OTHER';
  description: string;
  quantity: number;
  unitPriceCents: string;
  totalCents: string;
  vatRate: number;
  partId?: string | null;
  position: number;
}

interface EstimateResponse {
  id: string;
  estimateNumber: string;
  customerId: string;
  vehicleId?: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  subtotalCents: string;
  vatCents: string;
  totalCents: string;
  discountCents: string;
  validUntil?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  bookingId?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines?: EstimateLineResponse[];
}

/** Map backend EstimateStatus to frontend QuoteStatus */
function mapStatus(backendStatus: EstimateResponse['status']): QuoteStatus {
  const statusMap: Record<EstimateResponse['status'], QuoteStatus> = {
    DRAFT: 'draft',
    SENT: 'sent',
    ACCEPTED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
    CONVERTED: 'approved',
  };
  return statusMap[backendStatus];
}

/** Map backend EstimateLineType to frontend QuoteItem type */
function mapLineType(backendType: EstimateLineResponse['type']): QuoteItem['type'] {
  const typeMap: Record<EstimateLineResponse['type'], QuoteItem['type']> = {
    LABOR: 'labor',
    PART: 'parts',
    OTHER: 'service',
  };
  return typeMap[backendType];
}

/** Convert a backend Estimate response to the frontend Quote interface */
function mapEstimateToQuote(estimate: EstimateResponse): Quote {
  const totalCents = Number(estimate.totalCents);
  const createdDate = estimate.createdAt
    ? new Date(estimate.createdAt).toISOString().split('T')[0]
    : '';
  const expiryDate = estimate.validUntil
    ? new Date(estimate.validUntil).toISOString().split('T')[0]
    : '';

  let validForDays = 30;
  if (estimate.validUntil && estimate.createdAt) {
    const diffMs = new Date(estimate.validUntil).getTime() - new Date(estimate.createdAt).getTime();
    validForDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    id: estimate.id,
    number: estimate.estimateNumber,
    customer: {
      id: estimate.customerId,
      name: estimate.customerId,
      email: '',
    },
    vehicle: undefined,
    date: createdDate,
    expiryDate,
    amount: totalCents / 100,
    status: mapStatus(estimate.status),
    validForDays,
    convertedToInvoiceId: estimate.bookingId ?? undefined,
    notes: estimate.notes ?? undefined,
    items: (estimate.lines ?? []).map(line => ({
      id: line.id,
      description: line.description,
      type: mapLineType(line.type),
      quantity: line.quantity,
      unitPrice: Number(line.unitPriceCents) / 100,
      taxRate: Number(line.vatRate),
    })),
  };
}

// Status Badge Component
function StatusBadge({ status }: { status: QuoteStatus }) {
  const config = {
    draft: {
      label: 'Bozza',
      icon: FileClock,
      className: 'bg-[var(--border-default)] dark:bg-[var(--border-default)] text-[var(--text-primary)] dark:text-[var(--text-primary)]',
    },
    sent: {
      label: 'Inviato',
      icon: Send,
      className: 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)] text-[var(--status-info)] dark:text-[var(--status-info)]',
    },
    approved: {
      label: 'Approvato',
      icon: FileCheck,
      className: 'bg-[var(--status-success-subtle)] dark:bg-[var(--status-success-subtle)] text-[var(--status-success)] dark:text-[var(--status-success)]',
    },
    rejected: {
      label: 'Rifiutato',
      icon: FileX,
      className: 'bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] text-[var(--status-error)] dark:text-[var(--status-error)]',
    },
    expired: {
      label: 'Scaduto',
      icon: AlertCircle,
      className: 'bg-[var(--status-warning)]/10 dark:bg-[var(--status-warning-subtle)] text-[var(--status-warning)] dark:text-[var(--status-warning)]',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${className}`}
    >
      <Icon className='h-3.5 w-3.5' />
      {label}
    </span>
  );
}

// Expiry Badge Component
function ExpiryBadge({ expiryDate, status }: { expiryDate: string; status: QuoteStatus }) {
  if (status === 'approved' || status === 'rejected') {
    return null;
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) {
    return <span className='text-footnote text-[var(--status-error)] font-medium'>Scaduto</span>;
  }

  if (daysUntilExpiry <= 3) {
    return (
      <span className='text-footnote text-[var(--status-warning)] font-medium'>
        Scade tra {daysUntilExpiry} gg
      </span>
    );
  }

  return (
    <span className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
      Valido ancora {daysUntilExpiry} gg
    </span>
  );
}

export default function QuotesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  // Build SWR key based on filters
  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') {
      const backendStatusMap: Record<QuoteStatus, string> = {
        draft: 'DRAFT',
        sent: 'SENT',
        approved: 'ACCEPTED',
        rejected: 'REJECTED',
        expired: 'EXPIRED',
      };
      params.set('status', backendStatusMap[statusFilter]);
    }
    params.set('limit', '50');
    return `/api/dashboard/quotes?${params.toString()}`;
  }, [statusFilter]);

  const {
    data: json,
    isLoading,
    mutate,
  } = useSWR<{ data?: EstimateResponse[]; meta?: { total?: number } }>(swrKey, fetcher);

  const quotes = useMemo(() => {
    if (!json) return [];
    const estimateData: EstimateResponse[] =
      json.data ?? (json as unknown as EstimateResponse[]) ?? [];
    return (Array.isArray(estimateData) ? estimateData : []).map(mapEstimateToQuote);
  }, [json]);

  const totalQuotes = json?.meta?.total ?? quotes.length;

  // Calculate stats from loaded quotes
  const stats = useMemo(() => {
    const totalPending = quotes
      .filter(q => q.status === 'sent' || q.status === 'draft')
      .reduce((sum, q) => sum + q.amount, 0);

    const approved = quotes
      .filter(q => q.status === 'approved')
      .reduce((sum, q) => sum + q.amount, 0);

    return {
      totalPending,
      approved,
      draftCount: quotes.filter(q => q.status === 'draft').length,
      sentCount: quotes.filter(q => q.status === 'sent').length,
      approvedCount: quotes.filter(q => q.status === 'approved').length,
      rejectedCount: quotes.filter(q => q.status === 'rejected').length,
      expiredCount: quotes.filter(q => q.status === 'expired').length,
    };
  }, [quotes]);

  // Filter quotes by search query
  const filteredQuotes = useMemo(() => {
    if (!searchQuery) return quotes;

    const query = searchQuery.toLowerCase();
    return quotes.filter(quote => {
      return (
        quote.number.toLowerCase().includes(query) ||
        quote.customer.name.toLowerCase().includes(query) ||
        quote.customer.email.toLowerCase().includes(query) ||
        quote.vehicle?.licensePlate.toLowerCase().includes(query) ||
        quote.vehicle?.make.toLowerCase().includes(query)
      );
    });
  }, [quotes, searchQuery]);

  const handleConvertToInvoice = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/invoices/quotes/${quoteId}/convert`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Errore nella conversione del preventivo (${res.status})`);
      }
      router.push('/dashboard/invoices');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Errore durante la conversione in fattura';
      setError(message);
    }
  };

  const statCards = [
    { label: 'In Bozza', value: String(stats.draftCount), icon: FileClock, color: 'bg-[var(--surface-secondary)]0' },
    { label: 'Inviati', value: stats.sentCount > 0 ? formatCurrency(stats.totalPending) : '0', icon: Send, color: 'bg-[var(--brand)]' },
    { label: 'Approvati', value: stats.approvedCount > 0 ? formatCurrency(stats.approved) : '0', icon: FileCheck, color: 'bg-[var(--status-success)]' },
    { label: 'Rifiutati', value: String(stats.rejectedCount), icon: FileX, color: 'bg-[var(--status-error)]' },
    { label: 'Scaduti', value: String(stats.expiredCount), icon: AlertCircle, color: 'bg-[var(--status-warning)]' },
  ];

  return (
    <div>
      {/* Header */}
      <header>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AppleButton
                variant='ghost'
                size='sm'
                icon={<ArrowLeft className='h-4 w-4' />}
                onClick={() => router.push('/dashboard/invoices')}
              >
                Fatture
              </AppleButton>
            </div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Preventivi</h1>
            <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
              Gestisci preventivi e trasformali in fatture
            </p>
          </div>
          <AppleButton
            icon={<Plus className='h-4 w-4' />}
            onClick={() => router.push('/dashboard/estimates/new')}
          >
            Nuovo Preventivo
          </AppleButton>
        </div>
      </header>

      <div className='p-8 space-y-6'>
        {/* Stats Cards */}
        <div className='grid grid-cols-2 lg:grid-cols-5 gap-bento'>
          {statCards.map(stat => (
            <AppleCard key={stat.label} hover={false}>
              <AppleCardContent>
                <div className='flex items-center justify-between mb-3'>
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className='h-5 w-5 text-[var(--text-on-brand)]' />
                  </div>
                </div>
                <p className='text-title-1 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  {isLoading ? '...' : stat.value}
                </p>
                <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{stat.label}</p>
              </AppleCardContent>
            </AppleCard>
          ))}
        </div>

        {/* Filters */}
        <AppleCard hover={false}>
          <AppleCardContent>
            <div className='flex flex-col sm:flex-row gap-4'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                <Input
                  placeholder='Cerca preventivo...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>
              <div className='relative'>
                <Filter className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none' />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as QuoteStatus | 'all')}
                  className='h-10 pl-10 pr-4 rounded-md border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-body text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-apple-blue appearance-none cursor-pointer'
                >
                  <option value='all'>Tutti gli stati</option>
                  <option value='draft'>Bozza</option>
                  <option value='sent'>Inviato</option>
                  <option value='approved'>Approvato</option>
                  <option value='rejected'>Rifiutato</option>
                  <option value='expired'>Scaduto</option>
                </select>
              </div>
            </div>
          </AppleCardContent>
        </AppleCard>

        {/* Loading State */}
        {isLoading && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                <p className='text-body text-[var(--status-error)] font-medium'>{error}</p>
                <AppleButton variant='ghost' className='mt-4' onClick={() => mutate()}>
                  Riprova
                </AppleButton>
              </div>
            </AppleCardContent>
          </AppleCard>
        )}

        {/* Quotes Table */}
        {!isLoading && !error && (
          <AppleCard hover={false}>
            <AppleCardContent>
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-body'>
                  <thead>
                    <tr className='border-b border-[var(--border-default)]/20 dark:border-[var(--border-default)]'>
                      <th className='px-4 py-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Numero</th>
                      <th className='px-4 py-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Cliente</th>
                      <th className='px-4 py-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Veicolo</th>
                      <th className='px-4 py-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Data</th>
                      <th className='px-4 py-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Scadenza</th>
                      <th className='px-4 py-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right'>Importo</th>
                      <th className='px-4 py-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Stato</th>
                      <th className='px-4 py-3 text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] text-center'>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map(quote => (
                      <tr
                        key={quote.id}
                        className='border-b border-[var(--border-default)]/10 dark:border-[var(--border-default)]/50 last:border-b-0 hover:bg-[var(--surface-secondary)]/30 dark:hover:bg-[var(--surface-hover)] transition-colors'
                      >
                        <td className='px-4 py-3'>
                          <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {quote.number}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div>
                            <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                              {quote.customer.name}
                            </p>
                            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                              {quote.customer.email}
                            </p>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          {quote.vehicle ? (
                            <div>
                              <p className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                {quote.vehicle.make} {quote.vehicle.model}
                              </p>
                              <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                                {quote.vehicle.licensePlate}
                              </p>
                            </div>
                          ) : (
                            <span className='text-[var(--text-tertiary)]'>-</span>
                          )}
                        </td>
                        <td className='px-4 py-3 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                          {formatDate(quote.date)}
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex flex-col gap-1'>
                            <span className={`text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] ${
                              quote.status === 'expired' ? 'text-[var(--status-error)]' : ''
                            }`}>
                              {formatDate(quote.expiryDate)}
                            </span>
                            <ExpiryBadge expiryDate={quote.expiryDate} status={quote.status} />
                          </div>
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <span className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {formatCurrency(quote.amount)}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <StatusBadge status={quote.status} />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-center gap-1'>
                            <AppleButton variant='ghost' size='sm' onClick={() => router.push(`/dashboard/estimates/${quote.id}`)}>
                              <Eye className='h-4 w-4' />
                            </AppleButton>
                            <AppleButton variant='ghost' size='sm' onClick={async () => {
                              try {
                                const res = await fetch(`/api/estimates/${quote.id}/pdf`);
                                if (!res.ok) throw new Error('Errore PDF');
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `preventivo-${quote.number}.pdf`;
                                a.click();
                                URL.revokeObjectURL(url);
                              } catch {
                                setError('Errore durante il download del PDF');
                              }
                            }}>
                              <Download className='h-4 w-4' />
                            </AppleButton>
                            {quote.status === 'sent' && (
                              <AppleButton
                                variant='ghost'
                                size='sm'
                                onClick={() => handleConvertToInvoice(quote.id)}
                              >
                                <FileCheck className='h-4 w-4' />
                              </AppleButton>
                            )}
                            {quote.status === 'draft' && (
                              <AppleButton variant='ghost' size='sm' onClick={async () => {
                                try {
                                  const res = await fetch(`/api/estimates/${quote.id}/send`, { method: 'POST' });
                                  if (!res.ok) throw new Error('Errore invio');
                                  mutate();
                                } catch {
                                  setError('Errore durante l\'invio del preventivo');
                                }
                              }}>
                                <Send className='h-4 w-4' />
                              </AppleButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredQuotes.length === 0 && !isLoading && (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <FileText className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun preventivo trovato</p>
                  <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    Prova a modificare i filtri o crea un nuovo preventivo
                  </p>
                </div>
              )}

              {/* Pagination */}
              <div className='flex items-center justify-between border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)] px-4 py-4 mt-4'>
                <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  Mostrando {filteredQuotes.length} di {totalQuotes} preventivi
                </p>
              </div>
            </AppleCardContent>
          </AppleCard>
        )}
      </div>
    </div>
  );
}
