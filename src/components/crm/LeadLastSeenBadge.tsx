import { Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLeadLastSeen } from '@/hooks/useLeadLastSeen';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeadLastSeenBadgeProps {
  leadId: string;
  className?: string;
}

export function LeadLastSeenBadge({ leadId, className }: LeadLastSeenBadgeProps) {
  const { data, isLoading } = useLeadLastSeen(leadId);

  if (isLoading) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium',
        className
      )}>
        <Clock className="h-3 w-3" />
        <span>...</span>
      </div>
    );
  }

  const lastSeenAt = data?.lastSeenAt;
  const interactionType = data?.interactionType;

  if (!lastSeenAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium cursor-default',
              className
            )}>
              <Clock className="h-3 w-3" />
              <span>Never</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No activity recorded</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const relativeTime = formatDistanceToNow(lastSeenAt, { addSuffix: true });
  const fullDateTime = format(lastSeenAt, 'PPpp'); // e.g., "Dec 21, 2025 at 3:45 PM"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium cursor-default',
            className
          )}>
            <Clock className="h-3 w-3" />
            <span>{relativeTime}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{interactionType}</p>
            <p className="text-muted-foreground">{fullDateTime}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
