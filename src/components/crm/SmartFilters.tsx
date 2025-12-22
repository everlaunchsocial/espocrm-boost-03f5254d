import { Clock, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLeadsNeedingFollowUp, useLeadsWithRecentActivity } from '@/hooks/useLeadsNeedingFollowUp';
import { cn } from '@/lib/utils';

export type SmartFilterType = 'needsFollowUp' | 'newAiSummary';

interface SmartFiltersProps {
  activeFilters: SmartFilterType[];
  onToggleFilter: (filter: SmartFilterType) => void;
}

export function SmartFilters({ activeFilters, onToggleFilter }: SmartFiltersProps) {
  const { data: followUpLeadIds } = useLeadsNeedingFollowUp();
  const { data: recentActivityLeadIds } = useLeadsWithRecentActivity();

  const followUpCount = followUpLeadIds?.size || 0;
  const recentActivityCount = recentActivityLeadIds?.size || 0;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Needs Follow-Up Filter */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 transition-colors",
                activeFilters.includes('needsFollowUp') &&
                  "border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700"
              )}
              onClick={() => onToggleFilter('needsFollowUp')}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Follow-Up</span>
              {followUpCount > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-0.5 h-5 px-1.5 text-xs",
                    activeFilters.includes('needsFollowUp') && "bg-amber-500/20"
                  )}
                >
                  {followUpCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Leads with unresolved AI follow-ups</p>
          </TooltipContent>
        </Tooltip>

        {/* New AI Summary Filter */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 transition-colors",
                activeFilters.includes('newAiSummary') &&
                  "border-primary bg-primary/10 text-primary hover:bg-primary/20"
              )}
              onClick={() => onToggleFilter('newAiSummary')}
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span className="text-xs">New Activity</span>
              {recentActivityCount > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-0.5 h-5 px-1.5 text-xs",
                    activeFilters.includes('newAiSummary') && "bg-primary/20"
                  )}
                >
                  {recentActivityCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Leads with fresh activity in the last 48 hours</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
