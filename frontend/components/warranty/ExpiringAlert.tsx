'use client';

import * as React from 'react';
import { AlertTriangle, X, Clock, ChevronRight, Bell } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WarrantyWithClaims } from '@/lib/services/warrantyService';

interface ExpiringAlertProps {
  warranties: WarrantyWithClaims[];
  onViewAll?: () => void;
  onViewWarranty?: (warrantyId: string) => void;
  className?: string;
}

function calculateDaysRemaining(expirationDate: Date | string): number {
  const now = new Date().getTime();
  const expiry = new Date(expirationDate).getTime();
  const diff = expiry - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ExpiringAlert({
  warranties,
  onViewAll,
  onViewWarranty,
  className,
}: ExpiringAlertProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || warranties.length === 0) {
    return null;
  }

  // Sort by days remaining
  const sortedWarranties = [...warranties].sort((a, b) => {
    const daysA = calculateDaysRemaining(a.expirationDate);
    const daysB = calculateDaysRemaining(b.expirationDate);
    return daysA - daysB;
  });

  const mostUrgent = sortedWarranties[0];
  const daysRemaining = calculateDaysRemaining(mostUrgent.expirationDate);

  const isCritical = daysRemaining <= 7;
  const isWarning = daysRemaining <= 30;

  return (
    <Alert
      className={cn(
        'relative',
        isCritical
          ? 'border-[var(--status-error)]/30 bg-[var(--status-error-subtle)]'
          : isWarning
            ? 'border-[var(--status-warning)]/30 bg-[var(--status-warning)]/5'
            : 'border-[var(--status-info)]/30 bg-[var(--status-info-subtle)]',
        className
      )}
    >
      <Bell
        className={cn(
          'h-4 w-4',
          isCritical ? 'text-[var(--status-error)]' : isWarning ? 'text-[var(--status-warning)]' : 'text-[var(--status-info)]'
        )}
      />
      <AlertTitle
        className={cn(
          'flex items-center gap-2',
          isCritical ? 'text-[var(--status-error)]' : isWarning ? 'text-[var(--status-warning)]' : 'text-[var(--status-info)]'
        )}
      >
        <AlertTriangle className='h-4 w-4' />
        {warranties.length === 1
          ? 'Garanzia in Scadenza'
          : `${warranties.length} Garanzie in Scadenza`}
      </AlertTitle>
      <AlertDescription
        className={cn(
          'mt-2',
          isCritical ? 'text-[var(--status-error)]' : isWarning ? 'text-[var(--status-warning)]' : 'text-[var(--status-info)]'
        )}
      >
        <div className='space-y-3'>
          {/* Most urgent warranty */}
          {warranties.length === 1 ? (
            <p>
              La garanzia per {mostUrgent.vehicle?.make} {mostUrgent.vehicle?.model} scade tra{' '}
              <span className={cn('font-semibold', isCritical ? 'text-[var(--status-error)]' : 'text-[var(--status-warning)]')}>
                {daysRemaining} giorni
              </span>
              .
            </p>
          ) : (
            <>
              <p>
                La garanzia più urgente scade tra{' '}
                <span
                  className={cn('font-semibold', isCritical ? 'text-[var(--status-error)]' : 'text-[var(--status-warning)]')}
                >
                  {daysRemaining} giorni
                </span>
                .
              </p>

              {/* List of expiring warranties */}
              <div className='space-y-2 mt-3'>
                {sortedWarranties.slice(0, 3).map(warranty => {
                  const days = calculateDaysRemaining(warranty.expirationDate);
                  return (
                    <div
                      key={warranty.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded cursor-pointer transition-colors',
                        isCritical ? 'bg-[var(--status-error-subtle)] hover:bg-[var(--status-error)]/20' : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]'
                      )}
                      onClick={() => onViewWarranty?.(warranty.id)}
                    >
                      <div className='flex items-center gap-2'>
                        <Clock className='h-3 w-3' />
                        <span className='text-sm font-medium'>
                          {warranty.vehicle?.make} {warranty.vehicle?.model}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          days <= 7
                            ? 'text-[var(--status-error)]'
                            : days <= 30
                              ? 'text-[var(--status-warning)]'
                              : 'text-[var(--status-info)]'
                        )}
                      >
                        {days}g
                      </span>
                    </div>
                  );
                })}
                {sortedWarranties.length > 3 && (
                  <p className='text-sm text-center py-1'>
                    e altre {sortedWarranties.length - 3}...
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className='flex items-center gap-2 pt-2'>
            {onViewAll && (
              <Button
                variant='outline'
                size='sm'
                className={cn(
                  'flex-1',
                  isCritical
                    ? 'border-[var(--status-error)]/30 hover:bg-[var(--status-error-subtle)]'
                    : 'border-[var(--status-warning)]/30 hover:bg-[var(--status-warning)]/10'
                )}
                onClick={onViewAll}
              >
                Vedi Tutte
                <ChevronRight className='h-4 w-4 ml-1' />
              </Button>
            )}
            {onViewWarranty && warranties.length === 1 && (
              <Button
                size='sm'
                className={cn(
                  'flex-1',
                  isCritical ? 'bg-[var(--status-error)] hover:bg-[var(--status-error)]' : 'bg-[var(--status-warning)] hover:bg-[var(--status-warning)]'
                )}
                onClick={() => onViewWarranty(mostUrgent.id)}
              >
                Vedi Dettagli
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className={cn(
          'absolute top-2 right-2 p-1 rounded-full transition-colors',
          isCritical
            ? 'hover:bg-[var(--status-error)]/20 text-[var(--status-error)]'
            : isWarning
              ? 'hover:bg-[var(--status-warning)]/20 text-[var(--status-warning)]'
              : 'hover:bg-[var(--status-info)]/20 text-[var(--status-info)]'
        )}
      >
        <X className='h-4 w-4' />
      </button>
    </Alert>
  );
}

export default ExpiringAlert;
