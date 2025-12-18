import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BacklogCard } from './BacklogCard';
import type { BacklogItemWithRelations } from '@/types/backlog';

interface SortableBacklogCardProps {
  item: BacklogItemWithRelations;
  onOpen: (item: BacklogItemWithRelations) => void;
  onAbandon: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableBacklogCard({
  item,
  onOpen,
  onAbandon,
  onRestore,
  onDelete,
}: SortableBacklogCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BacklogCard
        item={item}
        onOpen={onOpen}
        onAbandon={onAbandon}
        onRestore={onRestore}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
}