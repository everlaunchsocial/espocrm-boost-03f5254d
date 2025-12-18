import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BacklogColumn } from './BacklogColumn';
import { BacklogCard } from './BacklogCard';
import type { BacklogColumn as BacklogColumnType, BacklogItemWithRelations } from '@/types/backlog';

interface BacklogBoardProps {
  columns: BacklogColumnType[];
  onOpenItem: (item: BacklogItemWithRelations) => void;
  onQuickAdd: (title: string, statusId: string) => void;
  onAbandonItem: (id: string) => void;
  onRestoreItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem: (itemId: string, newStatusId: string, newPosition: number) => void;
  showAbandoned: boolean;
}

export function BacklogBoard({
  columns,
  onOpenItem,
  onQuickAdd,
  onAbandonItem,
  onRestoreItem,
  onDeleteItem,
  onMoveItem,
  showAbandoned,
}: BacklogBoardProps) {
  const [activeItem, setActiveItem] = useState<BacklogItemWithRelations | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findItem = (id: string): BacklogItemWithRelations | undefined => {
    for (const column of columns) {
      const item = column.items.find((i) => i.id === id);
      if (item) return item;
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = findItem(active.id as string);
    if (item) {
      setActiveItem(item);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which column the item was dropped on
    const targetColumn = columns.find(
      (col) => col.id === overId || col.items.some((item) => item.id === overId)
    );

    if (!targetColumn) return;

    // Get the item being dragged
    const draggedItem = findItem(activeId);
    if (!draggedItem) return;

    // If dropped on the same column, do nothing for now (reordering within column)
    if (draggedItem.status_id === targetColumn.id && activeId !== overId) {
      // Find position based on where it was dropped
      const targetItems = targetColumn.items.filter((i) => !i.is_abandoned);
      const overIndex = targetItems.findIndex((i) => i.id === overId);
      const newPosition = overIndex >= 0 ? overIndex : targetItems.length;
      onMoveItem(activeId, targetColumn.id, newPosition);
      return;
    }

    // Moving to a different column
    if (draggedItem.status_id !== targetColumn.id) {
      const targetItems = targetColumn.items.filter((i) => !i.is_abandoned);
      const newPosition = targetItems.length;
      onMoveItem(activeId, targetColumn.id, newPosition);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full h-full">
        <div className="flex gap-4 p-4 pb-24">
          {columns.map((column) => (
            <BacklogColumn
              key={column.id}
              column={column}
              onOpenItem={onOpenItem}
              onQuickAdd={onQuickAdd}
              onAbandonItem={onAbandonItem}
              onRestoreItem={onRestoreItem}
              onDeleteItem={onDeleteItem}
              showAbandoned={showAbandoned}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      <DragOverlay>
        {activeItem ? (
          <div className="opacity-80">
            <BacklogCard
              item={activeItem}
              onOpen={() => {}}
              onAbandon={() => {}}
              onRestore={() => {}}
              onDelete={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}