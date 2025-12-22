import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useClassifyCallOutcome, CALL_OUTCOME_CONFIG, CallOutcomeType } from '@/hooks/useCallOutcome';
import { cn } from '@/lib/utils';

interface CallOutcomeBadgeProps {
  callLogId: string;
  outcome?: string | null;
  confidence?: number | null;
  reason?: string | null;
  durationSeconds?: number | null;
  transcript?: string;
  showRetry?: boolean;
  className?: string;
}

export function CallOutcomeBadge({
  callLogId,
  outcome,
  confidence,
  reason,
  durationSeconds,
  transcript,
  showRetry = true,
  className,
}: CallOutcomeBadgeProps) {
  const [localOutcome, setLocalOutcome] = useState(outcome);
  const [localReason, setLocalReason] = useState(reason);
  const [localConfidence, setLocalConfidence] = useState(confidence);
  
  const classifyMutation = useClassifyCallOutcome();

  const config = localOutcome 
    ? CALL_OUTCOME_CONFIG[localOutcome as CallOutcomeType] 
    : null;

  const handleClassify = async (forceRefresh = false) => {
    try {
      const result = await classifyMutation.mutateAsync({
        callLogId,
        transcript,
        durationSeconds: durationSeconds ?? undefined,
        forceRefresh,
      });
      setLocalOutcome(result.outcome);
      setLocalReason(result.reason);
      setLocalConfidence(result.confidence);
    } catch (error) {
      console.error('Failed to classify call outcome:', error);
    }
  };

  // Auto-classify if no outcome exists
  if (!localOutcome && !classifyMutation.isPending) {
    handleClassify(false);
  }

  const durationStr = durationSeconds 
    ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
    : null;

  const confidencePercent = localConfidence 
    ? Math.round(localConfidence * 100)
    : null;

  if (classifyMutation.isPending && !localOutcome) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Classifying...</span>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1.5 text-sm", config.color)}>
              <span>{config.icon}</span>
              <span className="font-medium">{config.label}</span>
              {durationStr && (
                <span className="text-muted-foreground">({durationStr})</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="text-sm">{localReason || 'AI-classified outcome'}</p>
              {confidencePercent && (
                <p className="text-xs text-muted-foreground">
                  Confidence: {confidencePercent}%
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showRetry && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleClassify(true)}
                disabled={classifyMutation.isPending}
              >
                <RefreshCw className={cn(
                  "h-3 w-3",
                  classifyMutation.isPending && "animate-spin"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Retry AI Classification</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
