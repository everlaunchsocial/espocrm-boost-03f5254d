import { Lead } from '@/types/crm';
import { getLeadSourceConfig } from '@/lib/pipelineStatus';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Calendar, DollarSign, Percent } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface PipelineLeadCardProps {
  lead: Lead;
  onClick?: () => void;
  isDragging?: boolean;
}

export function PipelineLeadCard({ lead, onClick, isDragging = false }: PipelineLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const sourceConfig = getLeadSourceConfig(lead.source);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const nextActionDate = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
  const isOverdue = nextActionDate && isPast(nextActionDate) && !isToday(nextActionDate);
  const isDueToday = nextActionDate && isToday(nextActionDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all',
        'hover:shadow-md hover:border-primary/50',
        isDragging && 'opacity-50 shadow-lg rotate-2 scale-105'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span title={sourceConfig.label}>{sourceConfig.icon}</span>
            <h4 className="font-medium text-sm text-foreground truncate">
              {lead.company || `${lead.firstName} ${lead.lastName}`}
            </h4>
          </div>
          {lead.company && (
            <p className="text-xs text-muted-foreground truncate">
              {lead.firstName} {lead.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Value & Probability */}
      <div className="flex items-center gap-3 mb-2 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span className="font-medium text-foreground">
            ${(lead.estimatedValue || 999).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Percent className="h-3 w-3" />
          <span className={cn(
            'font-medium',
            (lead.probability || 0) >= 70 ? 'text-green-600' :
            (lead.probability || 0) >= 40 ? 'text-amber-600' : 'text-muted-foreground'
          )}>
            {lead.probability || 10}%
          </span>
        </div>
      </div>

      {/* Next Action Date */}
      {nextActionDate && (
        <div className={cn(
          'flex items-center gap-1.5 text-xs rounded px-2 py-1',
          isOverdue && 'bg-destructive/10 text-destructive',
          isDueToday && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
          !isOverdue && !isDueToday && 'bg-muted text-muted-foreground'
        )}>
          <Calendar className="h-3 w-3" />
          <span>
            {isOverdue ? '⚠️ Overdue: ' : isDueToday ? 'Today: ' : ''}
            {format(nextActionDate, 'MMM d')}
          </span>
        </div>
      )}

      {/* Next Action */}
      {lead.nextAction && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
          📝 {lead.nextAction}
        </p>
      )}
    </div>
  );
}
