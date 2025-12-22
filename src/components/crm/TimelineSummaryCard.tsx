import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useLeadTimelineSummary } from '@/hooks/useLeadTimelineSummary';
import { formatDistanceToNow } from 'date-fns';

interface TimelineSummaryCardProps {
  leadId: string;
  leadName: string;
}

export function TimelineSummaryCard({ leadId, leadName }: TimelineSummaryCardProps) {
  const { summary, generatedAt, cached, isLoading, error, generateSummary, refresh } = 
    useLeadTimelineSummary({ leadId, leadName });

  useEffect(() => {
    generateSummary();
  }, [generateSummary]);

  if (isLoading && !summary) {
    return (
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating timeline summary...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4 border-destructive/20 bg-destructive/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-destructive">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => refresh()} className="h-6 px-2">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-medium text-primary">AI Timeline Summary</p>
              <div className="flex items-center gap-1">
                {generatedAt && (
                  <span className="text-xs text-muted-foreground">
                    {cached ? 'Cached ' : ''}{formatDistanceToNow(generatedAt, { addSuffix: true })}
                  </span>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => refresh()} 
                  disabled={isLoading}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{summary}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
