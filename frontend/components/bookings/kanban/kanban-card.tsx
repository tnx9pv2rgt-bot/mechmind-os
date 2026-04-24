'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Clock, Car, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BookingCardData {
  id: string;
  customerName: string;
  customerPhone?: string;
  vehiclePlate: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  serviceName: string;
  serviceCategory: string;
  scheduledAt: string;
  durationMinutes?: number;
  estimatedCost?: number;
  status: string;
}

interface KanbanCardProps {
  item: BookingCardData;
  isOverlay?: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  });
}

export function KanbanCard({ item, isOverlay }: KanbanCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: 'card', item },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'cursor-grab rounded-xl border bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] p-3 shadow-sm',
        'border-[var(--border-default)]/20 dark:border-[var(--border-default)]',
        'active:cursor-grabbing touch-none',
        'hover:shadow-md dark:hover:border-[var(--border-default)] transition-all',
        isDragging && 'opacity-40',
        isOverlay && 'shadow-xl ring-2 ring-[var(--status-info)]/20'
      )}
      role='button'
      aria-roledescription='elemento trascinabile'
    >
      <div className='space-y-2'>
        {/* Customer name */}
        <p className='text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] line-clamp-1'>
          {item.customerName}
        </p>

        {/* Vehicle info */}
        <div className='flex items-center gap-2 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
          <Car className='h-3 w-3 flex-shrink-0' />
          <span className='font-mono'>{item.vehiclePlate}</span>
          {item.vehicleBrand && (
            <span className='truncate'>
              {item.vehicleBrand} {item.vehicleModel || ''}
            </span>
          )}
        </div>

        {/* Service */}
        <p className='text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] line-clamp-1'>
          {item.serviceName || item.serviceCategory}
        </p>

        {/* Bottom row: time + phone */}
        <div className='flex items-center justify-between pt-1 border-t border-[var(--border-default)]/10 dark:border-[var(--border-default)]'>
          <div className='flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
            <Clock className='h-3 w-3' />
            <span>{formatTime(item.scheduledAt)}</span>
            <span className='text-[10px]'>{formatDate(item.scheduledAt)}</span>
          </div>

          {item.customerPhone && (
            <a
              href={`tel:${item.customerPhone}`}
              onClick={e => e.stopPropagation()}
              className='p-1 rounded-md hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] transition-colors'
              aria-label={`Chiama ${item.customerName}`}
            >
              <Phone className='h-3 w-3 text-[var(--status-success)]' />
            </a>
          )}
        </div>

        {/* Duration badge */}
        {item.durationMinutes && (
          <span className='inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] dark:bg-[var(--surface-active)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
            {item.durationMinutes} min
          </span>
        )}
      </div>
    </motion.div>
  );
}
