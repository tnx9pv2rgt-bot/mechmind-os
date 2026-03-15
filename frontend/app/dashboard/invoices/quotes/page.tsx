'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileClock,
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

  // Calculate validForDays from created to expiry
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
      name: estimate.customerId, // Backend doesn't include customer relation; ID used as fallback
      email: '',
    },
    vehicle: undefined, // Backend doesn't include vehicle relation
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
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    },
    sent: {
      label: 'Inviato',
      icon: Send,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    approved: {
      label: 'Approvato',
      icon: FileCheck,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    rejected: {
      label: 'Rifiutato',
      icon: FileX,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
    expired: {
      label: 'Scaduto',
      icon: AlertCircle,
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
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
    return <span className='text-xs text-red-600 dark:text-red-400 font-medium'>Scaduto</span>;
  }

  if (daysUntilExpiry <= 3) {
    return (
      <span className='text-xs text-orange-600 dark:text-orange-400 font-medium'>
        Scade tra {daysUntilExpiry} gg
      </span>
    );
  }

  return (
    <span className='text-xs text-gray-500 dark:text-gray-400'>
      Valido ancora {daysUntilExpiry} gg
    </span>
  );
}

// Stats Card Component
function StatsCard({
  title,
  amount,
  count,
  icon: Icon,
  color,
}: {
  title: string;
  amount?: number;
  count: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className='rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm'>
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-sm text-gray-600 dark:text-gray-400'>{title}</p>
          {amount !== undefined && (
            <p className='mt-2 text-2xl font-bold text-gray-900 dark:text-white'>
              {formatCurrency(amount)}
            </p>
          )}
          <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>{count} preventivi</p>
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className='h-5 w-5 text-white' />
        </div>
      </div>
    </div>
  );
}

export default function QuotesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch quotes from API
  const fetchQuotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        // Map frontend status to backend EstimateStatus
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

      const res = await fetch(`/api/dashboard/quotes?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Errore nel caricamento dei preventivi (${res.status})`);
      }

      const json = await res.json();
      const estimateData: EstimateResponse[] = json.data ?? json ?? [];
      const mapped = (Array.isArray(estimateData) ? estimateData : []).map(mapEstimateToQuote);

      setQuotes(mapped);
      setTotalQuotes(json.meta?.total ?? mapped.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(message);
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

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

  // Filter quotes by search query (status filtering is done server-side)
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
    // TODO: Create QuoteController endpoint in backend
    const res = await fetch(`/api/invoices/quotes/${quoteId}/convert`, { method: 'POST' });
    if (res.ok) router.push('/dashboard/invoices');
  };

  const handleCreateQuote = async (data: Record<string, string | number | boolean>) => {
    // TODO: Create QuoteController endpoint in backend
    const res = await fetch('/api/invoices/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) setIsCreateDialogOpen(false);
  };

  return (
    <div className='min-h-screen bg-gray-50 p-6 dark:bg-gray-900'>
      {/* Header */}
      <div className='mb-8'>
        <Button
          variant='ghost'
          size='sm'
          className='mb-2 -ml-2'
          onClick={() => router.push('/dashboard/invoices')}
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Torna alle Fatture
        </Button>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Preventivi</h1>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          Gestisci preventivi e trasformali in fatture
        </p>
      </div>

      {/* Stats Cards */}
      <div className='mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
        <StatsCard title='In Bozza' count={stats.draftCount} icon={FileClock} color='bg-gray-500' />
        <StatsCard
          title='Inviati'
          amount={stats.totalPending}
          count={stats.sentCount}
          icon={Send}
          color='bg-blue-500'
        />
        <StatsCard
          title='Approvati'
          amount={stats.approved}
          count={stats.approvedCount}
          icon={FileCheck}
          color='bg-green-500'
        />
        <StatsCard title='Rifiutati' count={stats.rejectedCount} icon={FileX} color='bg-red-500' />
        <StatsCard
          title='Scaduti'
          count={stats.expiredCount}
          icon={AlertCircle}
          color='bg-orange-500'
        />
      </div>

      {/* Actions Bar */}
      <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex flex-wrap items-center gap-3'>
          {/* Search */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
            <Input
              placeholder='Cerca preventivo...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-64 pl-10'
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={v => setStatusFilter(v as QuoteStatus | 'all')}
          >
            <SelectTrigger className='w-40'>
              <Filter className='mr-2 h-4 w-4' />
              <SelectValue placeholder='Stato' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Tutti gli stati</SelectItem>
              <SelectItem value='draft'>Bozza</SelectItem>
              <SelectItem value='sent'>Inviato</SelectItem>
              <SelectItem value='approved'>Approvato</SelectItem>
              <SelectItem value='rejected'>Rifiutato</SelectItem>
              <SelectItem value='expired'>Scaduto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Nuovo Preventivo
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className='rounded-xl bg-white shadow-sm dark:bg-gray-800 py-16 text-center'>
          <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500' />
          <p className='mt-4 text-gray-500 dark:text-gray-400'>Caricamento preventivi...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className='rounded-xl bg-white shadow-sm dark:bg-gray-800 py-12 text-center'>
          <AlertCircle className='mx-auto h-12 w-12 text-red-400' />
          <p className='mt-4 text-red-600 dark:text-red-400 font-medium'>{error}</p>
          <Button variant='outline' className='mt-4' onClick={fetchQuotes}>
            Riprova
          </Button>
        </div>
      )}

      {/* Quotes Table */}
      {!isLoading && !error && (
        <div className='rounded-xl bg-white shadow-sm dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-gray-50 dark:bg-gray-700/50'>
                <tr>
                  <th className='px-6 py-4 font-medium text-gray-700 dark:text-gray-300'>Numero</th>
                  <th className='px-6 py-4 font-medium text-gray-700 dark:text-gray-300'>
                    Cliente
                  </th>
                  <th className='px-6 py-4 font-medium text-gray-700 dark:text-gray-300'>
                    Veicolo
                  </th>
                  <th className='px-6 py-4 font-medium text-gray-700 dark:text-gray-300'>Data</th>
                  <th className='px-6 py-4 font-medium text-gray-700 dark:text-gray-300'>
                    Scadenza
                  </th>
                  <th className='px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right'>
                    Importo
                  </th>
                  <th className='px-6 py-4 font-medium text-gray-700 dark:text-gray-300'>Stato</th>
                  <th className='px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center'>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {filteredQuotes.map(quote => (
                  <tr
                    key={quote.id}
                    className='hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                  >
                    <td className='px-6 py-4'>
                      <span className='font-medium text-gray-900 dark:text-white'>
                        {quote.number}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <div>
                        <p className='font-medium text-gray-900 dark:text-white'>
                          {quote.customer.name}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {quote.customer.email}
                        </p>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      {quote.vehicle ? (
                        <div>
                          <p className='text-gray-900 dark:text-white'>
                            {quote.vehicle.make} {quote.vehicle.model}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {quote.vehicle.licensePlate}
                          </p>
                        </div>
                      ) : (
                        <span className='text-gray-400'>-</span>
                      )}
                    </td>
                    <td className='px-6 py-4 text-gray-600 dark:text-gray-400'>
                      {formatDate(quote.date)}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-col gap-1'>
                        <span
                          className={`text-gray-600 dark:text-gray-400 ${
                            quote.status === 'expired' ? 'text-red-600 dark:text-red-400' : ''
                          }`}
                        >
                          {formatDate(quote.expiryDate)}
                        </span>
                        <ExpiryBadge expiryDate={quote.expiryDate} status={quote.status} />
                      </div>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <span className='font-semibold text-gray-900 dark:text-white'>
                        {formatCurrency(quote.amount)}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center justify-center gap-2'>
                        <Button variant='ghost' size='icon-sm' title='Visualizza'>
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='icon-sm' title='Scarica PDF'>
                          <Download className='h-4 w-4' />
                        </Button>
                        {quote.status === 'sent' && (
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            title='Converti in fattura'
                            onClick={() => handleConvertToInvoice(quote.id)}
                          >
                            <FileCheck className='h-4 w-4' />
                          </Button>
                        )}
                        {quote.status === 'draft' && (
                          <Button variant='ghost' size='icon-sm' title='Invia'>
                            <Send className='h-4 w-4' />
                          </Button>
                        )}
                        <Button variant='ghost' size='icon-sm' title='Altro'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredQuotes.length === 0 && (
            <div className='py-12 text-center'>
              <FileText className='mx-auto h-12 w-12 text-gray-300 dark:text-gray-600' />
              <p className='mt-4 text-gray-500 dark:text-gray-400'>Nessun preventivo trovato</p>
              <p className='text-sm text-gray-400 dark:text-gray-500'>
                Prova a modificare i filtri o crea un nuovo preventivo
              </p>
            </div>
          )}

          {/* Pagination */}
          <div className='flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Mostrando {filteredQuotes.length} di {totalQuotes} preventivi
            </p>
            <div className='flex items-center gap-2'>
              <Button variant='outline' size='sm' disabled>
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button variant='outline' size='sm' disabled>
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
