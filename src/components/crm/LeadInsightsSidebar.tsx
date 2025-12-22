import { useLeadInsights, EngagementTrend } from '@/hooks/useLeadInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, Brain, TrendingUp, TrendingDown, Minus, 
  AlertTriangle, HelpCircle, Lightbulb
} from 'lucide-react';

interface LeadInsightsSidebarProps {
  leadId: string;
}

const trendConfig: Record<EngagementTrend, {
  icon: typeof TrendingUp;
  label: string;
  className: string;
}> = {
  increasing: {
    icon: TrendingUp,
    label: 'Increasing',
    className: 'text-green-600 bg-green-500/10 border-green-500/20',
  },
  flat: {
    icon: Minus,
    label: 'Flat',
    className: 'text-muted-foreground bg-muted border-border',
  },
  dropping: {
    icon: TrendingDown,
    label: 'Dropping',
    className: 'text-red-600 bg-red-500/10 border-red-500/20',
  },
};

export function LeadInsightsSidebar({ leadId }: LeadInsightsSidebarProps) {
  const { data, isLoading } = useLeadInsights(leadId);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasInterests = data.interests.length > 0;
  const hasTalkingPoints = data.talkingPoints.length > 0;
  const hasContent = hasInterests || hasTalkingPoints || data.riskWarning;

  if (!hasContent) {
    return null;
  }

  const trendConf = trendConfig[data.engagementTrend];
  const TrendIcon = trendConf.icon;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Lead Insights
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">Generated using notes, calls, demos, and AI summary patterns. Updated hourly.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Warning */}
        {data.riskWarning && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="text-xs font-medium text-red-600">{data.riskWarning}</span>
          </div>
        )}

        {/* Engagement Trend */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Engagement Trend (7d)
          </p>
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${trendConf.className} w-fit`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-xs font-medium">{trendConf.label}</span>
            {data.engagementChange !== 0 && (
              <span className="text-xs opacity-75">
                ({data.engagementChange > 0 ? '+' : ''}{data.engagementChange}%)
              </span>
            )}
          </div>
        </div>

        {/* Top Predicted Interests */}
        {hasInterests && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              Predicted Interests
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.interests.slice(0, 4).map((interest, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="text-xs bg-primary/10 text-primary border-primary/20"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI-Generated Talking Points */}
        {hasTalkingPoints && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Brain className="h-3 w-3" />
              Talking Points
            </p>
            <div className="space-y-2">
              {data.talkingPoints.slice(0, 3).map((tp, i) => (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-2 rounded-md bg-muted/50 border border-border/50 cursor-help">
                        <p className="text-xs">{tp.point}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs font-medium">Why this matters:</p>
                      <p className="text-xs text-muted-foreground">{tp.reason}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {/* Last Activity */}
        {data.lastActivityDays !== null && (
          <p className="text-xs text-muted-foreground">
            Last activity: {data.lastActivityDays === 0 ? 'Today' : `${data.lastActivityDays}d ago`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
