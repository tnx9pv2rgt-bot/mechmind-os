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
    if (sortField !== field) return <ArrowUpDown className='h-4 w-4 text-gray-400' />;
    return sortDirection === 'asc' ? (
      <ArrowUp className='h-4 w-4 text-brand-600' />
    ) : (
      <ArrowDown className='h-4 w-4 text-brand-600' />
    );
  };

  const getRankBadge = (locationId: string, metric: keyof typeof rankings) => {
    const rank = rankings[metric].indexOf(locationId);
    if (rank === 0) return <Medal className='h-4 w-4 text-yellow-500' />;
    if (rank === locations.length - 1)
      return <AlertCircle className='h-4 w-4 text-status-urgent' />;
    return null;
  };

  const getPerformanceIndicator = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className='h-4 w-4 text-status-ready' />;
      case 'down':
        return <TrendingDown className='h-4 w-4 text-status-urgent' />;
      default:
        return <Minus className='h-4 w-4 text-status-pending' />;
    }
  };

  return (
    <div className='space-y-4'>
      {/* Controls */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='flex items-center gap-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
            <Input
              placeholder='Cerca sede...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-10 w-64'
              aria-label='Cerca sede'
            />
          </div>
          <div className='flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1'>
            {(['today', 'week', 'month'] as const).map(period => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                  periodFilter === period
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {period === 'today' ? 'Oggi' : period === 'week' ? 'Settimana' : 'Mese'}
              </button>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-gray-600 dark:text-gray-400'>
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
            <thead className='bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
              <tr>
                <th
                  className='px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  onClick={() => handleSort('name')}
                >
                  <div className='flex items-center gap-2'>
                    Sede
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  onClick={() => handleSort('revenue')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    Fatturato
                    {getSortIcon('revenue')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  onClick={() => handleSort('orders')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    Ordini
                    {getSortIcon('orders')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  onClick={() => handleSort('aro')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    ARO
                    {getSortIcon('aro')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  onClick={() => handleSort('utilization')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    Utilizzo
                    {getSortIcon('utilization')}
                  </div>
                </th>
                <th
                  className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                  onClick={() => handleSort('satisfaction')}
                >
                  <div className='flex items-center justify-end gap-2'>
                    Rating
                    {getSortIcon('satisfaction')}
                  </div>
                </th>
                <th className='px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white'>
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
              {paginatedData.map((location, index) => (
                <tr
                  key={location.id}
                  className='hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <td className='px-4 py-4'>
                    <div className='flex items-center gap-3'>
                      <div className='h-10 w-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center'>
                        <Building2 className='h-5 w-5 text-brand-600' />
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <p className='font-medium text-gray-900 dark:text-white'>
                            {location.name}
                          </p>
                          {getRankBadge(location.id, 'revenue')}
                        </div>
                        <p className='text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1'>
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
                          ? 'text-status-ready'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {formatCurrency(location.revenue[periodFilter])}
                    </p>
                    {rankings.revenue.indexOf(location.id) === 0 && (
                      <span className='text-xs text-status-ready font-medium'>Top performer</span>
                    )}
                    {rankings.revenue.indexOf(location.id) === locations.length - 1 && (
                      <span className='text-xs text-status-urgent font-medium'>
                        Necessita attenzione
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <p className='font-medium text-gray-900 dark:text-white'>{location.orders}</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {location.totalVehicles} veicoli
                    </p>
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      {getRankBadge(location.id, 'aro')}
                      <p className='font-medium text-gray-900 dark:text-white'>
                        {formatCurrency(location.aro)}
                      </p>
                    </div>
                  </td>
                  <td className='px-4 py-4 text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      <div className='w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                        <div
                          className={cn(
                            'h-full rounded-full',
                            location.utilization >= 80
                              ? 'bg-status-ready'
                              : location.utilization >= 60
                                ? 'bg-status-warning'
                                : 'bg-status-urgent'
                          )}
                          style={{ width: `${location.utilization}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'font-medium text-sm',
                          location.utilization >= 80
                            ? 'text-status-ready'
                            : location.utilization >= 60
                              ? 'text-status-warning'
                              : 'text-status-urgent'
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
                        <Star className='h-4 w-4 text-yellow-500 fill-yellow-500' />
                        <span className='font-medium text-gray-900 dark:text-white'>
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
          <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
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
              <span className='text-sm text-gray-600 dark:text-gray-400'>
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
        <div className='workshop-card bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20'>
          <div className='flex items-center gap-3'>
            <Medal className='h-8 w-8 text-yellow-600' />
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Miglior Fatturato</p>
              <p className='font-semibold text-gray-900 dark:text-white'>
                {
                  locationData.sort((a, b) => b.revenue[periodFilter] - a.revenue[periodFilter])[0]
                    ?.name
                }
              </p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'>
          <div className='flex items-center gap-3'>
            <Star className='h-8 w-8 text-green-600' />
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Miglior Rating</p>
              <p className='font-semibold text-gray-900 dark:text-white'>
                {locationData.sort((a, b) => b.satisfaction - a.satisfaction)[0]?.name}
              </p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'>
          <div className='flex items-center gap-3'>
            <TrendingUp className='h-8 w-8 text-blue-600' />
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>ARO più Alto</p>
              <p className='font-semibold text-gray-900 dark:text-white'>
                {locationData.sort((a, b) => b.aro - a.aro)[0]?.name}
              </p>
            </div>
          </div>
        </div>
        <div className='workshop-card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20'>
          <div className='flex items-center gap-3'>
            <Building2 className='h-8 w-8 text-purple-600' />
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Più Efficiente</p>
              <p className='font-semibold text-gray-900 dark:text-white'>
                {locationData.sort((a, b) => b.utilization - a.utilization)[0]?.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
