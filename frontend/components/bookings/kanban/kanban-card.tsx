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
        'cursor-grab rounded-xl border bg-white dark:bg-[#2f2f2f] p-3 shadow-sm',
        'border-apple-border/20 dark:border-[#424242]',
        'active:cursor-grabbing touch-none',
        'hover:shadow-md dark:hover:border-[#636366] transition-all',
        isDragging && 'opacity-40',
        isOverlay && 'shadow-xl ring-2 ring-blue-500/20'
      )}
      role='button'
      aria-roledescription='elemento trascinabile'
    >
      <div className='space-y-2'>
        {/* Customer name */}
        <p className='text-sm font-semibold text-apple-dark dark:text-[#ececec] line-clamp-1'>
          {item.customerName}
        </p>

        {/* Vehicle info */}
        <div className='flex items-center gap-2 text-xs text-apple-gray dark:text-[#636366]'>
          <Car className='h-3 w-3 flex-shrink-0' />
          <span className='font-mono'>{item.vehiclePlate}</span>
          {item.vehicleBrand && (
            <span className='truncate'>
              {item.vehicleBrand} {item.vehicleModel || ''}
            </span>
          )}
        </div>

        {/* Service */}
        <p className='text-xs text-apple-gray dark:text-[#636366] line-clamp-1'>
          {item.serviceName || item.serviceCategory}
        </p>

        {/* Bottom row: time + phone */}
        <div className='flex items-center justify-between pt-1 border-t border-apple-border/10 dark:border-[#424242]'>
          <div className='flex items-center gap-1.5 text-xs text-apple-gray dark:text-[#636366]'>
            <Clock className='h-3 w-3' />
            <span>{formatTime(item.scheduledAt)}</span>
            <span className='text-[10px]'>{formatDate(item.scheduledAt)}</span>
          </div>

          {item.customerPhone && (
            <a
              href={`tel:${item.customerPhone}`}
              onClick={e => e.stopPropagation()}
              className='p-1 rounded-md hover:bg-apple-light-gray dark:hover:bg-[#424242] transition-colors'
              aria-label={`Chiama ${item.customerName}`}
            >
              <Phone className='h-3 w-3 text-apple-green' />
            </a>
          )}
        </div>

        {/* Duration badge */}
        {item.durationMinutes && (
          <span className='inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-apple-light-gray dark:bg-[#424242] text-apple-gray dark:text-[#636366]'>
            {item.durationMinutes} min
          </span>
        )}
      </div>
    </motion.div>
  );
}
