import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEmailEngagementStats } from '@/hooks/useEmailEvents';
import { MailOpen, MousePointerClick, Flame, Loader2 } from 'lucide-react';

interface LeadEmailEngagementProps {
  leadId: string;
  compact?: boolean;
}

export function LeadEmailEngagement({ leadId, compact = false }: LeadEmailEngagementProps) {
  const { data: stats, isLoading } = useEmailEngagementStats(leadId);

  if (isLoading) {
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  }

  if (!stats || (stats.totalOpens === 0 && stats.totalClicks === 0)) {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {stats.isHighEngagement && (
                <Badge variant="secondary" className="h-5 px-1.5 bg-orange-500/10 text-orange-600">
                  <Flame className="h-3 w-3" />
                </Badge>
              )}
              {stats.totalOpens > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 bg-purple-500/10 text-purple-600">
                  <MailOpen className="h-3 w-3 mr-0.5" />
                  {stats.totalOpens}
                </Badge>
              )}
              {stats.totalClicks > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 bg-blue-500/10 text-blue-600">
                  <MousePointerClick className="h-3 w-3 mr-0.5" />
                  {stats.totalClicks}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>📬 Opened {stats.totalOpens}x</p>
              {stats.totalClicks > 0 && <p>🔗 Clicked {stats.totalClicks} link{stats.totalClicks !== 1 ? 's' : ''}</p>}
              {stats.isHighEngagement && <p className="text-orange-500 font-medium">🔥 High Interest</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stats.isHighEngagement && (
        <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20">
          <Flame className="h-3 w-3 mr-1" />
          High Interest
        </Badge>
      )}
      {stats.totalOpens > 0 && (
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
          <MailOpen className="h-3 w-3 mr-1" />
          Opened {stats.totalOpens}x
        </Badge>
      )}
      {stats.totalClicks > 0 && (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
          <MousePointerClick className="h-3 w-3 mr-1" />
          {stats.totalClicks} Link Click{stats.totalClicks !== 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}
