'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Wrench,
  AlertTriangle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceScheduleWithVehicle } from '@/lib/services/maintenanceService';

interface MaintenanceCalendarProps {
  className?: string;
  onEventClick?: (schedule: MaintenanceScheduleWithVehicle) => void;
}

interface CalendarEvent {
  date: Date;
  schedules: MaintenanceScheduleWithVehicle[];
}

export function MaintenanceCalendar({ className, onEventClick }: MaintenanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, MaintenanceScheduleWithVehicle[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);

      // Get schedules for the current month view (plus some buffer)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const startDate = new Date(startOfMonth);
      startDate.setDate(startDate.getDate() - 7); // Buffer before month

      const endDate = new Date(endOfMonth);
      endDate.setDate(endDate.getDate() + 7); // Buffer after month

      const params = new URLSearchParams();
      params.set('dueAfter', startDate.toISOString());
      params.set('dueBefore', endDate.toISOString());
      params.set('limit', '100');

      const response = await fetch(`/api/maintenance?${params}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Group schedules by date
          const grouped: Record<string, MaintenanceScheduleWithVehicle[]> = {};

          result.data.items.forEach((schedule: MaintenanceScheduleWithVehicle) => {
            const dateKey = new Date(schedule.nextDueDate).toDateString();
            if (!grouped[dateKey]) {
              grouped[dateKey] = [];
            }
            grouped[dateKey].push(schedule);
          });

          setEvents(grouped);
        }
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  const days: (Date | null)[] = [];

  // Empty cells before first day
  for (let i = 0; i < adjustedStartingDay; i++) {
    days.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const monthNames = [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card className={className}>
      <CardHeader className='pb-4'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <CalendarIcon className='h-5 w-5' />
            Calendario Manutenzioni
          </CardTitle>

          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={goToToday}>
              Oggi
            </Button>
            <Button
              variant='outline'
              size='icon'
              onClick={() => navigateMonth('prev')}
              aria-label='Mese precedente'
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <span className='min-w-[140px] text-center font-medium'>
              {monthNames[month]} {year}
            </span>
            <Button
              variant='outline'
              size='icon'
              onClick={() => navigateMonth('next')}
              aria-label='Mese successivo'
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className='grid grid-cols-7 gap-1'>
            {weekDays.map(day => (
              <div key={day} className='p-2 text-center text-sm font-medium text-gray-500'>
                {day}
              </div>
            ))}
            {[...Array(35)].map((_, i) => (
              <div
                key={i}
                className='aspect-square animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800'
              />
            ))}
          </div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className='grid grid-cols-7 gap-1'>
              {weekDays.map(day => (
                <div key={day} className='p-2 text-center text-sm font-medium text-gray-500'>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className='grid grid-cols-7 gap-1'>
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className='aspect-square' />;
                }

                const dateKey = date.toDateString();
                const dayEvents = events[dateKey] || [];
                const isToday = date.getTime() === today.getTime();
                const isPast = date < today;

                const hasOverdue = dayEvents.some(e => e.isOverdue);
                const hasDueSoon = dayEvents.some(e => !e.isOverdue && e.daysUntilDue <= 7);

                return (
                  <button
                    key={dateKey}
                    onClick={() => dayEvents.length > 0 && onEventClick?.(dayEvents[0])}
                    className={cn(
                      'relative aspect-square rounded-lg border p-1 text-left transition-colors',
                      isToday
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                        : 'border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50',
                      dayEvents.length > 0 && 'cursor-pointer',
                      isPast && !isToday && 'bg-gray-50/50 text-gray-400 dark:bg-gray-900/50'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isToday && 'text-blue-600 dark:text-blue-400'
                      )}
                    >
                      {date.getDate()}
                    </span>

                    {/* Event indicators */}
                    {dayEvents.length > 0 && (
                      <div className='absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5'>
                        {hasOverdue && <div className='h-1.5 w-1.5 rounded-full bg-red-500' />}
                        {hasDueSoon && <div className='h-1.5 w-1.5 rounded-full bg-yellow-500' />}
                        {!hasOverdue && !hasDueSoon && (
                          <div className='h-1.5 w-1.5 rounded-full bg-blue-500' />
                        )}
                        {dayEvents.length > 1 && (
                          <span className='ml-auto text-[10px] leading-none text-gray-400'>
                            +{dayEvents.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className='mt-4 flex flex-wrap items-center gap-4 border-t pt-4 text-sm'>
              <span className='text-gray-500'>Legenda:</span>
              <div className='flex items-center gap-1.5'>
                <div className='h-2 w-2 rounded-full bg-red-500' />
                <span>In ritardo</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className='h-2 w-2 rounded-full bg-yellow-500' />
                <span>A breve</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className='h-2 w-2 rounded-full bg-blue-500' />
                <span>In programma</span>
              </div>
            </div>

            {/* Selected date events preview (could be expanded) */}
            {Object.keys(events).length === 0 && (
              <div className='mt-8 text-center text-sm text-gray-500'>
                Nessuna manutenzione programmata per questo periodo
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function for type labels
function getMaintenanceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
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
