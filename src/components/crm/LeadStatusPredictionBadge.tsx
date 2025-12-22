import { useLeadStatusPrediction, PredictedStatus } from '@/hooks/useLeadStatusPrediction';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Flame, Sun, Snowflake } from 'lucide-react';

interface LeadStatusPredictionBadgeProps {
  leadId: string;
}

const statusConfig: Record<PredictedStatus, {
  label: string;
  icon: typeof Flame;
  className: string;
}> = {
  hot: {
    label: 'Hot',
    icon: Flame,
    className: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20',
  },
  warm: {
    label: 'Warm',
    icon: Sun,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
  },
  cold: {
    label: 'Cold',
    icon: Snowflake,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
  },
};

export function LeadStatusPredictionBadge({ leadId }: LeadStatusPredictionBadgeProps) {
  const { data, isLoading } = useLeadStatusPrediction(leadId);

  if (isLoading || !data) {
    return null;
  }

  const config = statusConfig[data.status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${config.className}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Predicted based on engagement in last 7 days</p>
          <p className="text-xs text-muted-foreground mt-1">{data.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
