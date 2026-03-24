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
    <div className='rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 sm:p-6'>
      <div className='flex items-start gap-3 mb-4'>
        <div className='w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0'>
          <AlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-400' />
        </div>
        <div>
          <h3 className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
            Slot già prenotato
          </h3>
          <p className='text-sm text-apple-gray dark:text-[#636366] mt-1'>
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
                <div className='flex items-center gap-2 text-sm text-apple-dark dark:text-[#ececec]'>
                  <User className='h-4 w-4 text-apple-gray dark:text-[#636366]' />
                  <span className='font-medium'>{conflict.customerName}</span>
                </div>
                <div className='flex items-center gap-2 text-sm text-apple-gray dark:text-[#636366]'>
                  <Calendar className='h-3.5 w-3.5' />
                  <span>
                    {new Date(conflict.scheduledAt).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className='flex items-center gap-2 text-sm text-apple-gray dark:text-[#636366]'>
                  <Clock className='h-3.5 w-3.5' />
                  <span>
                    {new Date(conflict.scheduledAt).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {conflict.serviceName && (
                  <span className='text-xs bg-gray-100 dark:bg-[#424242] text-apple-gray dark:text-[#ececec] px-2 py-0.5 rounded-full'>
                    {conflict.serviceName}
                  </span>
                )}
                {conflict.vehiclePlate && (
                  <span className='text-xs font-mono text-apple-gray dark:text-[#636366]'>
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
            className='flex-1 min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white'
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
