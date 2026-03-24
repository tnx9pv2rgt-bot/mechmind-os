'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Wrench,
  AlertTriangle,
  Calendar,
  Gauge,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  MoreHorizontal,
  Car,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceScheduleWithVehicle } from '@/lib/services/maintenanceService';
import type { MaintenanceType, NotificationLevel } from '@prisma/client';

interface MaintenanceListProps {
  vehicleId?: string;
  showFilters?: boolean;
  className?: string;
  onComplete?: (schedule: MaintenanceScheduleWithVehicle) => void;
  onEdit?: (schedule: MaintenanceScheduleWithVehicle) => void;
}

const maintenanceTypes: { value: MaintenanceType; label: string }[] = [
  { value: 'OIL_CHANGE', label: 'Cambio Olio' },
  { value: 'TIRE_ROTATION', label: 'Rotazione Pneumatici' },
  { value: 'BRAKE_CHECK', label: 'Controllo Freni' },
  { value: 'FILTER', label: 'Sostituzione Filtri' },
  { value: 'INSPECTION', label: 'Ispezione Generale' },
  { value: 'BELTS', label: 'Controllo Cinghie' },
  { value: 'BATTERY', label: 'Controllo Batteria' },
];

export function MaintenanceList({
  vehicleId,
  showFilters = true,
  className,
  onComplete,
  onEdit,
}: MaintenanceListProps) {
  const [schedules, setSchedules] = useState<MaintenanceScheduleWithVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MaintenanceType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'UPCOMING'>('ALL');

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      if (vehicleId) {
        params.set('vehicleId', vehicleId);
      }

      if (typeFilter !== 'ALL') {
        params.set('type', typeFilter);
      }

      if (statusFilter === 'OVERDUE') {
        params.set('isOverdue', 'true');
      }

      const response = await fetch(`/api/maintenance?${params}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSchedules(result.data.items);
          setTotal(result.data.total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, vehicleId, typeFilter, statusFilter]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleComplete = async (schedule: MaintenanceScheduleWithVehicle) => {
    onComplete?.(schedule);
  };

  const handleEdit = (schedule: MaintenanceScheduleWithVehicle) => {
    onEdit?.(schedule);
  };

  // Filter schedules locally by search query
  const filteredSchedules = schedules.filter(schedule => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const vehicleInfo =
      `${schedule.vehicle.make} ${schedule.vehicle.model} ${schedule.vehicle.licensePlate || ''}`.toLowerCase();
    const typeLabel = getMaintenanceTypeLabel(schedule.type).toLowerCase();
    return vehicleInfo.includes(query) || typeLabel.includes(query);
  });

  const totalPages = Math.ceil(total / limit);

  if (loading && schedules.length === 0) {
    return (
      <Card className={className}>
        <CardContent className='p-6'>
          <div className='space-y-4'>
            {[...Array(5)].map((_, i) => (
              <div key={i} className='h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800' />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className='pb-4'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Wrench className='h-5 w-5' />
            Programmazioni Manutenzione
            {total > 0 && (
              <Badge variant='secondary' className='ml-2'>
                {total}
              </Badge>
            )}
          </CardTitle>

          {showFilters && (
            <div className='flex flex-wrap items-center gap-2'>
              <div className='relative'>
                <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                <Input
                  placeholder='Cerca veicolo...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='w-48 pl-9'
                />
              </div>

              <Select
                value={typeFilter}
                onValueChange={v => setTypeFilter(v as MaintenanceType | 'ALL')}
              >
                <SelectTrigger className='w-40'>
                  <Filter className='mr-2 h-4 w-4' />
                  <SelectValue placeholder='Tipo' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Tutti i tipi</SelectItem>
                  {maintenanceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={v => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className='w-40'>
                  <SelectValue placeholder='Stato' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Tutti gli stati</SelectItem>
                  <SelectItem value='OVERDUE'>In ritardo</SelectItem>
                  <SelectItem value='UPCOMING'>In programma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {filteredSchedules.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <Wrench className='h-12 w-12 text-gray-300 dark:text-gray-600' />
            <h3 className='mt-4 text-lg font-medium text-gray-900 dark:text-gray-100'>
              Nessuna manutenzione trovata
            </h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              {searchQuery
                ? 'Prova a modificare i filtri di ricerca'
                : 'Crea una nuova programmazione per iniziare'}
            </p>
          </div>
        ) : (
          <>
            <div className='space-y-3'>
              {filteredSchedules.map(schedule => (
                <MaintenanceItem
                  key={schedule.id}
                  schedule={schedule}
                  onComplete={() => handleComplete(schedule)}
                  onEdit={() => handleEdit(schedule)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='mt-6 flex items-center justify-between'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Pagina {page} di {totalPages}
                </p>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface MaintenanceItemProps {
  schedule: MaintenanceScheduleWithVehicle;
  onComplete: () => void;
  onEdit: () => void;
}

function MaintenanceItem({ schedule, onComplete, onEdit }: MaintenanceItemProps) {
  const isOverdue = schedule.isOverdue;
  const isDueSoon = !isOverdue && schedule.daysUntilDue <= 7;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isOverdue && 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
        isDueSoon &&
          'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20'
      )}
    >
      {/* Status Indicator */}
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          isOverdue
            ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
            : isDueSoon
              ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
        )}
      >
        {isOverdue ? <AlertTriangle className='h-5 w-5' /> : <Calendar className='h-5 w-5' />}
      </div>

      {/* Main Content */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <h4 className='font-medium text-gray-900 dark:text-gray-100'>
            {getMaintenanceTypeLabel(schedule.type)}
          </h4>
          {isOverdue && (
            <Badge variant='destructive' className='text-xs'>
              In ritardo
            </Badge>
          )}
          {isDueSoon && (
            <Badge variant='default' className='bg-yellow-500 text-xs'>
              A breve
            </Badge>
          )}
        </div>

        <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400'>
          <span className='flex items-center gap-1'>
            <Car className='h-3.5 w-3.5' />
            {schedule.vehicle.make} {schedule.vehicle.model}
            {schedule.vehicle.licensePlate && ` (${schedule.vehicle.licensePlate})`}
          </span>
          <span className='flex items-center gap-1'>
            <Calendar className='h-3.5 w-3.5' />
            {isOverdue
              ? `${Math.abs(schedule.daysUntilDue)} giorni fa`
              : `Tra ${schedule.daysUntilDue} giorni`}
          </span>
          <span className='flex items-center gap-1'>
            <Gauge className='h-3.5 w-3.5' />
            {schedule.nextDueKm.toLocaleString()} km
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={onComplete} className='hidden sm:flex'>
          <CheckCircle className='mr-1.5 h-4 w-4' />
          Completa
        </Button>
        <Button variant='ghost' size='icon' onClick={onEdit} aria-label='Altre azioni'>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}

function getMaintenanceTypeLabel(type: MaintenanceType): string {
  const labels: Record<MaintenanceType, string> = {
    OIL_CHANGE: 'Cambio Olio',
    TIRE_ROTATION: 'Rotazione Pneumatici',
    BRAKE_CHECK: 'Controllo Freni',
    FILTER: 'Sostituzione Filtri',
    INSPECTION: 'Ispezione Generale',
    BELTS: 'Controllo Cinghie',
    BATTERY: 'Controllo Batteria',
  };
  return labels[type] || type;
}
