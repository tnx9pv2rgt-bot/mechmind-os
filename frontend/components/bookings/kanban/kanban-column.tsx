'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence } from 'framer-motion';
import { KanbanCard, type BookingCardData } from './kanban-card';
import { cn } from '@/lib/utils';

export interface KanbanColumnData {
  id: string;
  title: string;
  color: string;
  items: BookingCardData[];
}

interface KanbanColumnProps {
  column: KanbanColumnData;
}

export function KanbanColumn({ column }: KanbanColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const itemIds = useMemo(() => column.items.map(i => i.id), [column.items]);

  return (
    <div className='flex w-72 shrink-0 flex-col rounded-2xl bg-apple-light-gray/50 dark:bg-[#1a1a1a]'>
      {/* Column Header */}
      <div className='flex items-center justify-between px-4 py-3'>
        <div className='flex items-center gap-2'>
          <div className={cn('h-2.5 w-2.5 rounded-full', column.color)} />
          <h3 className='text-sm font-semibold text-apple-dark dark:text-[#ececec]'>
            {column.title}
          </h3>
        </div>
        <span className='flex h-5 min-w-[20px] items-center justify-center rounded-full bg-apple-light-gray dark:bg-[#353535] px-1.5 text-xs font-medium text-apple-gray dark:text-[#636366]'>
          {column.items.length}
        </span>
      </div>

      {/* Droppable area */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors rounded-b-2xl',
            isOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
          )}
          style={{ minHeight: '8rem', maxHeight: 'calc(100vh - 20rem)' }}
        >
          <AnimatePresence mode='popLayout'>
            {column.items.length === 0 ? (
              <div className='flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-apple-border/20 dark:border-[#424242] p-4'>
                <p className='text-xs text-apple-gray dark:text-[#636366]'>Trascina qui</p>
              </div>
            ) : (
              column.items.map(item => <KanbanCard key={item.id} item={item} />)
            )}
          </AnimatePresence>
        </div>
      </SortableContext>
    </div>
  );
}
