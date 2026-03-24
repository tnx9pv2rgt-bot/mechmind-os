'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensors,
  useSensor,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn, type KanbanColumnData } from './kanban-column';
import { KanbanCard, type BookingCardData } from './kanban-card';

interface KanbanBoardProps {
  columns: KanbanColumnData[];
  onStatusChange: (itemId: string, fromStatus: string, toStatus: string) => Promise<void>;
}

export function KanbanBoard({ columns: initialColumns, onStatusChange }: KanbanBoardProps): JSX.Element {
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Sync columns when props change (e.g., after API refetch)
  useMemo(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findColumn = useCallback(
    (id: UniqueIdentifier): KanbanColumnData | undefined => {
      const column = columns.find(col => col.id === id);
      if (column) return column;
      return columns.find(col => col.items.some(item => item.id === id));
    },
    [columns]
  );

  const activeItem = useMemo((): BookingCardData | null => {
    if (!activeId) return null;
    for (const col of columns) {
      const item = col.items.find(i => i.id === activeId);
      if (item) return item;
    }
    return null;
  }, [activeId, columns]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeColumn = findColumn(active.id);
      const overColumn = findColumn(over.id);
      if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

      setColumns(prev => {
        const activeItems = [...activeColumn.items];
        const overItems = [...overColumn.items];
        const activeIndex = activeItems.findIndex(i => i.id === active.id);
        const overIndex = overItems.findIndex(i => i.id === over.id);

        const [movedItem] = activeItems.splice(activeIndex, 1);
        const insertIndex = overIndex >= 0 ? overIndex : overItems.length;
        overItems.splice(insertIndex, 0, movedItem);

        return prev.map(col => {
          if (col.id === activeColumn.id) return { ...col, items: activeItems };
          if (col.id === overColumn.id) return { ...col, items: overItems };
          return col;
        });
      });
    },
    [findColumn]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeColumn = findColumn(active.id);
      const overColumn = findColumn(over.id);
      if (!activeColumn || !overColumn) return;

      // Same column reorder
      if (activeColumn.id === overColumn.id) {
        const items = [...activeColumn.items];
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        if (oldIndex !== newIndex) {
          setColumns(prev =>
            prev.map(col =>
              col.id === activeColumn.id
                ? { ...col, items: arrayMove(items, oldIndex, newIndex) }
                : col
            )
          );
        }
        return;
      }

      // Cross-column = status change
      await onStatusChange(active.id as string, activeColumn.id, overColumn.id);
    },
    [findColumn, onStatusChange]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className='flex gap-4 overflow-x-auto pb-4' style={{ minHeight: 'calc(100vh - 20rem)' }}>
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeItem ? <KanbanCard item={activeItem} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
