import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Filter, RefreshCw, Lightbulb } from 'lucide-react';
import { useBacklog } from '@/hooks/useBacklog';
import { BacklogBoard } from '@/components/backlog/BacklogBoard';
import { BacklogItemModal } from '@/components/backlog/BacklogItemModal';
import { CreateItemModal } from '@/components/backlog/CreateItemModal';
import { AbandonModal } from '@/components/backlog/AbandonModal';
import { BrainNotes } from '@/components/backlog/BrainNotes';
import type { BacklogItemWithRelations, BacklogFilters, BacklogPriority } from '@/types/backlog';

export default function Backlog() {
  const [search, setSearch] = useState('');
  const [showAbandoned, setShowAbandoned] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<BacklogPriority[]>([]);
  const [selectedItem, setSelectedItem] = useState<BacklogItemWithRelations | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [abandonTarget, setAbandonTarget] = useState<{ id: string; title: string } | null>(null);

  // Build filters
  const filters: BacklogFilters = {
    search: search || undefined,
    priority: priorityFilter.length > 0 ? priorityFilter : undefined,
  };

  const {
    board,
    tags,
    statuses,
    isLoading,
    createItem,
    updateItem,
    moveItem,
    deleteItem,
    abandonItem,
    restoreItem,
    updateTags,
    addComment,
    refresh,
    isCreating,
  } = useBacklog(filters);

  const handleQuickAdd = async (title: string, statusId: string) => {
    await createItem({ title, status_id: statusId });
  };

  const handleMoveItem = async (itemId: string, newStatusId: string, newPosition: number) => {
    await moveItem(itemId, { status_id: newStatusId, position: newPosition });
  };

  const handleAbandon = (id: string) => {
    const item = board.flatMap((c) => c.items).find((i) => i.id === id);
    if (item) {
      setAbandonTarget({ id, title: item.title });
    }
  };

  const handleConfirmAbandon = async (reason: string) => {
    if (abandonTarget) {
      await abandonItem(abandonTarget.id, reason);
      setAbandonTarget(null);
    }
  };

  const handleRestore = async (id: string) => {
    await restoreItem(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item? This cannot be undone.')) {
      await deleteItem(id);
    }
  };

  const togglePriorityFilter = (priority: BacklogPriority) => {
    setPriorityFilter((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  // Calculate stats
  const totalItems = board.reduce((sum, col) => sum + col.items.filter((i) => !i.is_abandoned).length, 0);
  const abandonedCount = board.reduce((sum, col) => sum + col.items.filter((i) => i.is_abandoned).length, 0);

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Feature Backlog</h1>
                <p className="text-sm text-muted-foreground">
                  {totalItems} active features
                  {abandonedCount > 0 && ` · ${abandonedCount} abandoned`}
                </p>
              </div>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Feature
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Priority
                  {priorityFilter.length > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                      {priorityFilter.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['critical', 'high', 'medium', 'low'] as BacklogPriority[]).map((priority) => (
                  <DropdownMenuCheckboxItem
                    key={priority}
                    checked={priorityFilter.includes(priority)}
                    onCheckedChange={() => togglePriorityFilter(priority)}
                  >
                    <span className="capitalize">{priority}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Switch
                id="show-abandoned"
                checked={showAbandoned}
                onCheckedChange={setShowAbandoned}
              />
              <Label htmlFor="show-abandoned" className="text-sm cursor-pointer">
                Show abandoned
              </Label>
            </div>

            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Brain Notes */}
          <div className="max-w-md">
            <BrainNotes />
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex gap-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="min-w-[280px] w-[280px] space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <BacklogBoard
              columns={board}
              onOpenItem={setSelectedItem}
              onQuickAdd={handleQuickAdd}
              onAbandonItem={handleAbandon}
              onRestoreItem={handleRestore}
              onDeleteItem={handleDelete}
              onMoveItem={handleMoveItem}
              showAbandoned={showAbandoned}
            />
          )}
        </div>

        {/* Modals */}
        <BacklogItemModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          statuses={statuses}
          tags={tags}
          onUpdate={updateItem}
          onUpdateTags={updateTags}
          onAddComment={addComment}
        />

        <CreateItemModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          statuses={statuses}
          tags={tags}
          onSubmit={createItem}
        />

        <AbandonModal
          isOpen={!!abandonTarget}
          onClose={() => setAbandonTarget(null)}
          onConfirm={handleConfirmAbandon}
          itemTitle={abandonTarget?.title}
        />
    </div>
  );
}
