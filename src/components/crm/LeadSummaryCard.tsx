import { useEffect } from 'react';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadSummary } from '@/hooks/useLeadSummary';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { formatDistanceToNow } from 'date-fns';

interface LeadSummaryCardProps {
  leadId: string;
  leadName: string;
}

export function LeadSummaryCard({ leadId, leadName }: LeadSummaryCardProps) {
  const { isEnabled } = useFeatureFlags();
  const { summary, isLoading, error, lastGenerated, generateSummary, hasData } = useLeadSummary({
    leadId,
    leadName,
  });

  // Auto-generate on mount if we have data and no summary yet
  useEffect(() => {
    if (hasData && !summary && !isLoading && !error) {
      generateSummary();
    }
  }, [hasData, summary, isLoading, error, generateSummary]);

  if (!isEnabled('aiCrmPhase2')) return null;

  return (
    <Card className="p-4 bg-muted/30 border-dashed">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">AI Summary</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={generateSummary}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Generating...' : 'Regenerate'}
        </Button>
      </div>

      {isLoading && !summary ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : summary ? (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
          {lastGenerated && (
            <p className="text-xs text-muted-foreground/60 mt-2">
              Generated {formatDistanceToNow(lastGenerated, { addSuffix: true })}
            </p>
          )}
        </>
      ) : !hasData ? (
        <p className="text-sm text-muted-foreground italic">
          No activity data available yet. Add notes or log activities to generate a summary.
        </p>
      ) : null}
    </Card>
  );
}
