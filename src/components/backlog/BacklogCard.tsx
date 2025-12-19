import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  ArrowUp,
  Equal,
  Minus,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  Archive,
  Trash2,
  RotateCcw,
  GripVertical,
  Search,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { BacklogItemWithRelations, BacklogPriority } from '@/types/backlog';

const PRIORITY_ICONS: Record<BacklogPriority, typeof AlertTriangle> = {
  critical: AlertTriangle,
  high: ArrowUp,
  medium: Equal,
  low: Minus,
};

const PRIORITY_COLORS: Record<BacklogPriority, string> = {
  critical: 'text-red-500',
  high: 'text-amber-500',
  medium: 'text-blue-500',
  low: 'text-muted-foreground',
};

interface BacklogCardProps {
  item: BacklogItemWithRelations;
  onOpen: (item: BacklogItemWithRelations) => void;
  onAbandon: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

export function BacklogCard({
  item,
  onOpen,
  onAbandon,
  onRestore,
  onDelete,
  isDragging,
}: BacklogCardProps) {
  const PriorityIcon = PRIORITY_ICONS[item.priority];

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
        item.is_abandoned && 'opacity-60 bg-muted/50',
        isDragging && 'shadow-lg ring-2 ring-primary'
      )}
      onClick={() => onOpen(item)}
    >
      <div className="p-3 space-y-2">
        {/* Header: Priority + Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <PriorityIcon className={cn('h-3.5 w-3.5', PRIORITY_COLORS[item.priority])} />
            <span className={cn('text-xs font-medium capitalize', PRIORITY_COLORS[item.priority])}>
              {item.priority}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {item.is_abandoned ? (
                <DropdownMenuItem onClick={() => onRestore(item.id)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onAbandon(item.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Abandon
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(item.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h4
          className={cn(
            'font-medium text-sm leading-tight line-clamp-2',
            item.is_abandoned && 'line-through text-muted-foreground'
          )}
        >
          {item.title}
        </h4>

        {/* Description preview */}
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Research Needed Indicator */}
        {item.research_notes && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-600 dark:text-amber-400">
                <Search className="h-3 w-3 flex-shrink-0" />
                <span className="text-[10px] font-medium line-clamp-1">Research Needed</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs whitespace-pre-wrap">{item.research_notes}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Footer: Metadata */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            {(item.comment_count ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]">
                <MessageSquare className="h-3 w-3" />
                {item.comment_count}
              </span>
            )}
            {(item.attachment_count ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]">
                <Paperclip className="h-3 w-3" />
                {item.attachment_count}
              </span>
            )}
            {item.research_notes && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                <Search className="h-3 w-3" />
              </span>
            )}
            {item.story_points && (
              <span className="text-[10px] bg-muted px-1 rounded">{item.story_points}pt</span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Abandoned reason */}
        {item.is_abandoned && item.abandoned_reason && (
          <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1 italic">
            Reason: {item.abandoned_reason}
          </div>
        )}
      </div>
    </Card>
  );
}
