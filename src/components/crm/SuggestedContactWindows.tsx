import { useContactWindowSuggestions } from '@/hooks/useContactWindowSuggestions';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, Clock, ThumbsUp, Info, AlertCircle } from 'lucide-react';

interface SuggestedContactWindowsProps {
  leadId: string;
}

export function SuggestedContactWindows({ leadId }: SuggestedContactWindowsProps) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');
  const { data, isLoading } = useContactWindowSuggestions(leadId);

  if (!phase2Enabled) return null;

  if (isLoading) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalDataPoints < 3) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Suggested Contact Windows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm">
              Not enough activity to suggest optimal contact windows yet.
              <span className="text-xs block mt-1">
                ({data?.totalDataPoints || 0}/3 data points collected)
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Suggested Contact Windows
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm font-medium mb-2">How this was calculated</p>
                <ul className="text-xs space-y-1">
                  <li>📞 Calls: {data.breakdown.calls}</li>
                  <li>👁️ Demo views: {data.breakdown.demoViews}</li>
                  <li>📝 Notes: {data.breakdown.notes}</li>
                  <li>📋 Activities: {data.breakdown.activities}</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on {data.totalDataPoints} total touchpoints
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.primary && (
          <div className="flex items-center gap-3 bg-background/60 rounded-lg p-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Best</p>
              <p className="text-sm font-semibold truncate">{data.primary.label}</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {data.primary.count} interactions
            </span>
          </div>
        )}

        {data.secondary && (
          <div className="flex items-center gap-3 bg-background/40 rounded-lg p-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground">
              <ThumbsUp className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Also good</p>
              <p className="text-sm font-medium truncate">{data.secondary.label}</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {data.secondary.count} interactions
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
