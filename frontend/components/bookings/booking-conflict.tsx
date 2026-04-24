'use client';

import { AlertTriangle, Calendar, Clock, User } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';

export interface ConflictingBooking {
  id: string;
  customerName: string;
  scheduledAt: string;
  serviceName?: string;
  vehiclePlate?: string;
}

interface BookingConflictProps {
  conflicts: ConflictingBooking[];
  onChooseOtherSlot: () => void;
  onForceBook: () => void;
  isAdmin?: boolean;
  isSubmitting?: boolean;
}

export function BookingConflict({
  conflicts,
  onChooseOtherSlot,
  onForceBook,
  isAdmin = false,
  isSubmitting = false,
}: BookingConflictProps): React.JSX.Element {
  return (
    <div className='rounded-2xl border-2 border-[var(--status-warning)]/40 dark:border-[var(--status-warning)] bg-[var(--status-warning)]/5 dark:bg-[var(--status-warning)]/40/20 p-4 sm:p-6'>
      <div className='flex items-start gap-3 mb-4'>
        <div className='w-10 h-10 rounded-xl bg-[var(--status-warning)]/50/20 flex items-center justify-center shrink-0'>
          <AlertTriangle className='h-5 w-5 text-[var(--status-warning)] dark:text-[var(--status-warning)]' />
        </div>
        <div>
          <h3 className='text-body font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
            Slot già prenotato
          </h3>
          <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
            {conflicts.length === 1
              ? 'Esiste già una prenotazione in questo orario.'
              : `Esistono ${conflicts.length} prenotazioni in questo orario.`}
          </p>
        </div>
      </div>

      {/* Conflicting bookings list */}
      <div className='space-y-3 mb-4'>
        {conflicts.map(conflict => (
          <AppleCard key={conflict.id} hover={false}>
            <AppleCardContent className='!p-3'>
              <div className='flex items-center gap-3 flex-wrap'>
                <div className='flex items-center gap-2 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                  <User className='h-4 w-4 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]' />
                  <span className='font-medium'>{conflict.customerName}</span>
                </div>
                <div className='flex items-center gap-2 text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  <Calendar className='h-3.5 w-3.5' />
                  <span>
                    {new Date(conflict.scheduledAt).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className='flex items-center gap-2 text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                  <Clock className='h-3.5 w-3.5' />
                  <span>
                    {new Date(conflict.scheduledAt).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {conflict.serviceName && (
                  <span className='text-xs bg-[var(--surface-secondary)] dark:bg-[var(--surface-active)] text-[var(--text-tertiary)] dark:text-[var(--text-primary)] px-2 py-0.5 rounded-full'>
                    {conflict.serviceName}
                  </span>
                )}
                {conflict.vehiclePlate && (
                  <span className='text-xs font-mono text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                    {conflict.vehiclePlate}
                  </span>
                )}
              </div>
            </AppleCardContent>
          </AppleCard>
        ))}
      </div>

      {/* Actions */}
      <div className='flex flex-col sm:flex-row gap-3'>
        <AppleButton
          variant='secondary'
          className='flex-1 min-h-[44px]'
          onClick={onChooseOtherSlot}
          disabled={isSubmitting}
        >
          Scegli altro slot
        </AppleButton>
        {isAdmin && (
          <AppleButton
            className='flex-1 min-h-[44px] bg-[var(--status-warning)] hover:bg-[var(--status-warning)] text-[var(--text-on-brand)]'
            onClick={onForceBook}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Prenota comunque
          </AppleButton>
        )}
      </div>
    </div>
  );
}
