import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Lightbulb, ClipboardList, Code, TestTube, CheckCircle, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BacklogCard } from './BacklogCard';
import type { BacklogColumn as BacklogColumnType, BacklogItemWithRelations } from '@/types/backlog';

const COLUMN_ICONS: Record<string, typeof Lightbulb> = {
  lightbulb: Lightbulb,
  'clipboard-list': ClipboardList,
  code: Code,
  'test-tube': TestTube,
  'check-circle': CheckCircle,
  archive: Archive,
};

interface BacklogColumnProps {
  column: BacklogColumnType;
  onOpenItem: (item: BacklogItemWithRelations) => void;
  onQuickAdd: (title: string, statusId: string) => void;
  onAbandonItem: (id: string) => void;
  onRestoreItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  showAbandoned: boolean;
}

export function BacklogColumn({
  column,
  onOpenItem,
  onQuickAdd,
  onAbandonItem,
  onRestoreItem,
  onDeleteItem,
  showAbandoned,
}: BacklogColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');

  const Icon = COLUMN_ICONS[column.icon] || Lightbulb;

  // Filter items based on abandoned status
  const visibleItems = column.items.filter((item) =>
    showAbandoned ? true : !item.is_abandoned
  );

  const activeCount = column.items.filter((item) => !item.is_abandoned).length;
  const abandonedCount = column.items.filter((item) => item.is_abandoned).length;

  const handleQuickAdd = () => {
    if (quickTitle.trim()) {
      onQuickAdd(quickTitle.trim(), column.id);
      setQuickTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-w-[280px] w-[280px] bg-muted/30 rounded-lg">
      {/* Column Header */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{ borderColor: `${column.color}40` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-md"
            style={{ backgroundColor: `${column.color}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: column.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{column.name}</h3>
            <p className="text-[10px] text-muted-foreground">
              {activeCount} active
              {abandonedCount > 0 && showAbandoned && ` · ${abandonedCount} abandoned`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Add Input */}
      {isAdding && (
        <div className="p-2 border-b">
          <Input
            autoFocus
            placeholder="Feature title..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQuickAdd();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setQuickTitle('');
              }
            }}
            onBlur={() => {
              if (!quickTitle.trim()) {
                setIsAdding(false);
              }
            }}
            className="h-8 text-sm"
          />
          <div className="flex gap-1 mt-1">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleQuickAdd}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setIsAdding(false);
                setQuickTitle('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <BacklogCard
              key={item.id}
              item={item}
              onOpen={onOpenItem}
              onAbandon={onAbandonItem}
              onRestore={onRestoreItem}
              onDelete={onDeleteItem}
            />
          ))}
          {visibleItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No items
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
