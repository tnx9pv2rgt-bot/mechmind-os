'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Medal,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  MapPin,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

type SortField = 'name' | 'revenue' | 'orders' | 'aro' | 'utilization' | 'satisfaction';
type SortDirection = 'asc' | 'desc';

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  isActive: boolean;
}

interface LocationMetrics {
  revenue: { today: number; week: number; month: number };
  carCount: { inService: number; waiting: number; ready: number };
  aro: number;
  satisfaction: number;
  utilization: number;
  orders: number;
  trend: 'up' | 'down' | 'neutral';
}

interface LocationComparisonProps {
  locations: Location[];
  metrics: Record<string, LocationMetrics>;
}

const ITEMS_PER_PAGE = 10;

export function LocationComparison({ locations, metrics }: LocationComparisonProps) {
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month'>('month');

  // Combine locations with metrics and calculate rankings
  const locationData = locations.map(location => {
    const locationMetrics = metrics[location.id];
    return {
      ...location,
      ...locationMetrics,
      totalVehicles:
        locationMetrics.carCount.inService +
        locationMetrics.carCount.waiting +
        locationMetrics.carCount.ready,
    };
  });

  // Filter by search
  const filteredData = locationData.filter(
    item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'revenue':
        aValue = a.revenue[periodFilter];
        bValue = b.revenue[periodFilter];
        break;
      case 'orders':
        aValue = a.orders;
        bValue = b.orders;
        break;
      case 'aro':
        aValue = a.aro;
        bValue = b.aro;
        break;
      case 'utilization':
        aValue = a.utilization;
        bValue = b.utilization;
        break;
      case 'satisfaction':
        aValue = a.satisfaction;
        bValue = b.satisfaction;
        break;
      default:
        aValue = a.revenue[periodFilter];
        bValue = b.revenue[periodFilter];
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue);
    }

    return sortDirection === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
  });

  // Calculate rankings for highlighting
  const rankings = {
    revenue: [...locationData]
      .sort((a, b) => b.revenue[periodFilter] - a.revenue[periodFilter])
      .map(l => l.id),
    orders: [...locationData].sort((a, b) => b.orders - a.orders).map(l => l.id),
    aro: [...locationData].sort((a, b) => b.aro - a.aro).map(l => l.id),
    utilization: [...locationData].sort((a, b) => b.utilization - a.utilization).map(l => l.id),
    satisfaction: [...locationData].sort((a, b) => b.satisfaction - a.satisfaction).map(l => l.id),
  };

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className='h-4 w-4 text-[var(--text-tertiary)]' />;
    return sortDirection === 'asc' ? (
      <ArrowUp className='h-4 w-4 text-[var(--brand)]' />
    ) : (
      <ArrowDown className='h-4 w-4 text-[var(--brand)]' />
    );
  };

  const getRankBadge = (locationId: string, metric: keyof typeof rankings) => {
    const rank = rankings[metric].indexOf(locationId);
    if (rank === 0) return <Medal className='h-4 w-4 text-[var(--status-warning)]' />;
    if (rank === locations.length - 1)
      return <AlertCircle className='h-4 w-4 text-[var(--status-error)]' />;
    return null;
  };

  const getPerformanceIndicator = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className='h-4 w-4 text-[var(--status-success)]' />;
      case 'down':
        return <TrendingDown className='h-4 w-4 text-[var(--status-error)]' />;
      default:
        return <Minus className='h-4 w-4 text-[var(--status-warning)]' />;
    }
  };

  return (
    <div className='space-y-4'>
      {/* Controls */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='flex items-center gap-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
            <Input
              placeholder='Cerca sede...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-10 w-64'
              aria-label='Cerca sede'
            />
          </div>
          <div className='flex items-center gap-2 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] p-1'>
            {(['today', 'week', 'month'] as const).map(period => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                  periodFilter === period
                    ? 'bg-brand-600 text-[var(--text-on-brand)]'
                    : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]'
                )}
              >
                {period === 'today' ? 'Oggi' : period === 'week' ? 'Settimana' : 'Mese'}
              </button>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
            {filteredData.length} sedi totali
          </span>
          <Button variant='outline' size='sm'>
            <Download className='mr-2 h-4 w-4' />
            Esporta
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className='workshop-card overflow-hidden p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] border-b border-[var(--border-default)] dark:border-[var(--border-default)]'>
              <tr>
                <th
                  className='px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors'
                  onClick={() => handleSort('name')}
                >
                  <div className='flex items-center gap-2'>
                    Sede
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors'
                  onClick={() => handleSort('revenue')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    Fatturato
                    {getSortIcon('revenue')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors'
                  onClick={() => handleSort('orders')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    Ordini
                    {getSortIcon('orders')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors'
                  onClick={() => handleSort('aro')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    ARO
                    {getSortIcon('aro')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors'
                  onClick={() => handleSort('utilization')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    Utilizzo
                    {getSortIcon('utilization')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors'
                  onClick={() => handleSort('satisfaction')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    Rating
                    {getSortIcon('satisfaction')}
                  </div>
                </th>
                <th className='px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[var(--border-default)] dark:divide-gray-700'>
              {paginatedData.map((location, index) => (
                <tr
                  key={location.id}
                  className='hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50 transition-colors'
                >
                  <td className='px-4 py-4'>
                    <div className='flex items-center gap-3'>
                      <div className='h-10 w-10 rounded-lg bg-[var(--brand)]/10 dark:bg-[var(--brand)]/40/30 flex items-center justify-center'>
                        <Building2 className='h-5 w-5 text-[var(--brand)]' />
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                            {location.name}
                          </p>
                          {getRankBadge(location.id, 'revenue')}
                        </div>
                        <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex items-center gap-1'>
                          <MapPin className='h-3 w-3' />
                          {location.city}, {location.region}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <p
                      className={cn(
                        'font-semibold',
                        rankings.revenue.indexOf(location.id) === 0
                          ? 'text-[var(--status-success)]'
                          : 'text-[var(--text-primary)] dark:text-[var(--text-primary)]'
                      )}
                    >
                      {formatCurrency(location.revenue[periodFilter])}
                    </p>
                    {rankings.revenue.indexOf(location.id) === 0 && (
                      <span className='text-xs text-[var(--status-success)] font-medium'>Top performer</span>
                    )}
                    {rankings.revenue.indexOf(location.id) === locations.length - 1 && (
                      <span className='text-xs text-[var(--status-error)] font-medium'>
                        Necessita attenzione
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>{location.orders}</p>
                    <p className='text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                      {location.totalVehicles} veicoli
                    </p>
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      {getRankBadge(location.id, 'aro')}
                      <p className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                        {formatCurrency(location.aro)}
                      </p>
                    </div>
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      <div className='w-16 h-2 bg-[var(--border-default)] dark:bg-[var(--border-default)] rounded-full overflow-hidden'>
                        <div
                          className={cn(
                            'h-full rounded-full',
                            location.utilization >= 80
                              ? 'bg-[var(--status-success)]'
                              : location.utilization >= 60
                                ? 'bg-[var(--status-warning)]'
                                : 'bg-[var(--status-error)]'
                          )}
                          style={{ width: `${location.utilization}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'font-medium text-sm',
                          location.utilization >= 80
                            ? 'text-[var(--status-success)]'
                            : location.utilization >= 60
                              ? 'text-[var(--status-warning)]'
                              : 'text-[var(--status-error)]'
                        )}
                      >
                        {location.utilization}%
                      </span>
                    </div>
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      {getRankBadge(location.id, 'satisfaction')}
                      <div className='flex items-center gap-1'>
                        <Star className='h-4 w-4 text-[var(--status-warning)] fill-yellow-500' />
                        <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                          {location.satisfaction}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-4 text-center'>
                    <div className='flex items-center justify-center'>
                      {getPerformanceIndicator(location.trend)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)] dark:border-[var(--border-default)]'>
            <div className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} di {filteredData.length}
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label='Pagina precedente'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>
                Pagina {currentPage} di {totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label='Pagina successiva'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='workshop-card bg-gradient-to-br from-[var(--status-warning)]/5 to-[var(--status-warning)]/10 dark:from-[var(--status-warning)]/40/20 dark:to-[var(--status-warning)]/20'>
          <div className='flex items-center gap-3'>
            <Medal className='h-8 w-8 text-[var(--status-warning)]' />
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Miglior Fatturato</p>
              <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {
                  locationData.sort((a, b) => b.revenue[periodFilter] - a.revenue[periodFilter])[0]
                    ?.name
                }
              </p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-[var(--status-success)]/5 to-[var(--status-success)]/10 dark:from-[var(--status-success)]/40/20 dark:to-[var(--status-success)]/20'>
          <div className='flex items-center gap-3'>
            <Star className='h-8 w-8 text-[var(--status-success)]' />
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Miglior Rating</p>
              <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {locationData.sort((a, b) => b.satisfaction - a.satisfaction)[0]?.name}
              </p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-[var(--status-info)]/5 to-[var(--status-info)]/10 dark:from-[var(--status-info)]/40/20 dark:to-[var(--status-info)]/20'>
          <div className='flex items-center gap-3'>
            <TrendingUp className='h-8 w-8 text-[var(--status-info)]' />
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>ARO più Alto</p>
              <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {locationData.sort((a, b) => b.aro - a.aro)[0]?.name}
              </p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-[var(--brand)]/5 to-[var(--brand)]/10 dark:from-[var(--brand)]/40/20 dark:to-[var(--brand)]/20'>
          <div className='flex items-center gap-3'>
            <Building2 className='h-8 w-8 text-[var(--brand)]' />
            <div>
              <p className='text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'>Più Efficiente</p>
              <p className='font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {locationData.sort((a, b) => b.utilization - a.utilization)[0]?.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
