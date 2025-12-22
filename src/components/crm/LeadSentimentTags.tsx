import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useLeadSentiment, Sentiment, Urgency } from '@/hooks/useLeadSentiment';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface LeadSentimentTagsProps {
  leadId: string;
  leadName: string;
}

const sentimentConfig: Record<Sentiment, { emoji: string; label: string; className: string }> = {
  positive: { emoji: '😊', label: 'Positive', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  neutral: { emoji: '😐', label: 'Neutral', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  negative: { emoji: '😠', label: 'Negative', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
};

const urgencyConfig: Record<Urgency, { emoji: string; label: string; className: string }> = {
  high: { emoji: '🔥', label: 'High Urgency', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  medium: { emoji: '⏳', label: 'Medium Urgency', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  low: { emoji: '💤', label: 'Low Urgency', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
};

export function LeadSentimentTags({ leadId, leadName }: LeadSentimentTagsProps) {
  const { flags } = useFeatureFlags();
  const { analysis, isLoading, error, analyzeSentiment, hasData } = useLeadSentiment({ leadId, leadName });

  useEffect(() => {
    if (hasData && !analysis && !isLoading) {
      analyzeSentiment();
    }
  }, [hasData, analysis, isLoading, analyzeSentiment]);

  if (!flags.aiCrmPhase2) return null;

  if (!hasData) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>No data for sentiment analysis</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Analyzing sentiment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">{error}</span>
        <Button variant="ghost" size="sm" onClick={analyzeSentiment} className="h-6 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (!analysis) return null;

  const sentiment = sentimentConfig[analysis.sentiment];
  const urgency = urgencyConfig[analysis.urgency];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={sentiment.className}>
              {sentiment.emoji} {sentiment.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{analysis.sentimentReason}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={urgency.className}>
              {urgency.emoji} {urgency.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{analysis.urgencyReason}</p>
          </TooltipContent>
        </Tooltip>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={analyzeSentiment} 
          disabled={isLoading}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
