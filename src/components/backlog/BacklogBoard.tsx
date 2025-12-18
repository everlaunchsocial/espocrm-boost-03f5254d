import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BacklogColumn } from './BacklogColumn';
import type { BacklogColumn as BacklogColumnType, BacklogItemWithRelations } from '@/types/backlog';

interface BacklogBoardProps {
  columns: BacklogColumnType[];
  onOpenItem: (item: BacklogItemWithRelations) => void;
  onQuickAdd: (title: string, statusId: string) => void;
  onAbandonItem: (id: string) => void;
  onRestoreItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  showAbandoned: boolean;
}

export function BacklogBoard({
  columns,
  onOpenItem,
  onQuickAdd,
  onAbandonItem,
  onRestoreItem,
  onDeleteItem,
  showAbandoned,
}: BacklogBoardProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4 min-h-[calc(100vh-200px)]">
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
    </ScrollArea>
  );
}
