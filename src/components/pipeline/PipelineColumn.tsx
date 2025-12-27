import { Lead } from '@/types/crm';
import { PipelineStatus, PIPELINE_STATUS_CONFIG } from '@/lib/pipelineStatus';
import { PipelineLeadCard } from './PipelineLeadCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface PipelineColumnProps {
  stage: PipelineStatus;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function PipelineColumn({ stage, leads, onLeadClick }: PipelineColumnProps) {
  const config = PIPELINE_STATUS_CONFIG[stage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  // Calculate total value in this column
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 bg-muted/30 rounded-lg flex flex-col',
        isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Column Header */}
      <div className={cn('p-3 rounded-t-lg border-b border-border', config.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <h3 className={cn('font-semibold text-sm', config.color)}>
              {config.shortLabel}
            </h3>
          </div>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.bgColor, config.color)}>
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            ${totalValue.toLocaleString()} pipeline value
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No leads</p>
            <p className="text-xs mt-1">Drag leads here</p>
          </div>
        ) : (
          leads.map((lead) => (
            <PipelineLeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
            />
          ))
        )}
      </div>
    </div>
  );
}
