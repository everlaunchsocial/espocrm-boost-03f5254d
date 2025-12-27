import { Lead } from '@/types/crm';
import { getLeadSourceConfig, getPipelineStatusConfig } from '@/lib/pipelineStatus';
import { DataTable } from '@/components/crm/DataTable';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, DollarSign } from 'lucide-react';

interface PipelineListViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function PipelineListView({ leads, onLeadClick }: PipelineListViewProps) {
  const columns = [
    {
      key: 'company',
      label: 'Business',
      render: (lead: Lead) => {
        const sourceConfig = getLeadSourceConfig(lead.source);
        return (
          <div className="flex items-center gap-2">
            <span title={sourceConfig.label}>{sourceConfig.icon}</span>
            <div>
              <p className="font-medium text-foreground">
                {lead.company || `${lead.firstName} ${lead.lastName}`}
              </p>
              {lead.company && (
                <p className="text-xs text-muted-foreground">
                  {lead.firstName} {lead.lastName}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'source',
      label: 'Source',
      render: (lead: Lead) => {
        const config = getLeadSourceConfig(lead.source);
        return (
          <span className={cn('text-sm', config.color)}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (lead: Lead) => {
        const config = getPipelineStatusConfig(lead.pipelineStatus || 'new_lead');
        return (
          <span className={cn('px-2 py-1 rounded text-xs font-medium', config.bgColor, config.color)}>
            {config.icon} {config.shortLabel}
          </span>
        );
      },
    },
    {
      key: 'value',
      label: 'Value',
      render: (lead: Lead) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">
            ${(lead.estimatedValue || 999).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'probability',
      label: 'Prob',
      render: (lead: Lead) => (
        <span className={cn(
          'font-medium',
          (lead.probability || 0) >= 70 ? 'text-green-600' :
          (lead.probability || 0) >= 40 ? 'text-amber-600' : 'text-muted-foreground'
        )}>
          {lead.probability || 10}%
        </span>
      ),
    },
    {
      key: 'nextAction',
      label: 'Next Action',
      render: (lead: Lead) => {
        const nextActionDate = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
        const isOverdue = nextActionDate && isPast(nextActionDate) && !isToday(nextActionDate);
        const isDueToday = nextActionDate && isToday(nextActionDate);

        return (
          <div>
            {nextActionDate && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue && 'text-destructive',
                isDueToday && 'text-amber-600',
                !isOverdue && !isDueToday && 'text-muted-foreground'
              )}>
                <Calendar className="h-3 w-3" />
                {isOverdue && '⚠️ '}
                {format(nextActionDate, 'MMM d')}
              </div>
            )}
            {lead.nextAction && (
              <p className="text-xs text-muted-foreground truncate max-w-32">
                {lead.nextAction}
              </p>
            )}
            {!nextActionDate && !lead.nextAction && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'location',
      label: 'Location',
      render: (lead: Lead) => (
        <span className="text-sm text-muted-foreground">
          {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={leads}
      columns={columns}
      searchPlaceholder="Search leads..."
      searchKeys={['firstName', 'lastName', 'email', 'company', 'city']}
      onRowClick={onLeadClick}
    />
  );
}
