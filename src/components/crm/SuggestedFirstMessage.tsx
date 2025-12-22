import { useEffect, useState } from 'react';
import { useSuggestedFirstMessage } from '@/hooks/useSuggestedFirstMessage';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lightbulb, Send, X, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestedFirstMessageProps {
  leadId: string;
  leadName: string;
  leadCompany?: string;
  leadTitle?: string;
  leadIndustry?: string;
  onEditAndSend: (message: string) => void;
}

export function SuggestedFirstMessage({
  leadId,
  leadName,
  leadCompany,
  leadTitle,
  leadIndustry,
  onEditAndSend,
}: SuggestedFirstMessageProps) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const {
    message,
    isLoading,
    error,
    generate,
    dismiss,
    isDismissed,
  } = useSuggestedFirstMessage(leadId, leadName, leadCompany, leadTitle, leadIndustry);

  // Auto-generate on first mount
  useEffect(() => {
    if (phase2Enabled && !hasGenerated && !isDismissed) {
      generate();
      setHasGenerated(true);
    }
  }, [phase2Enabled, hasGenerated, isDismissed, generate]);

  if (!phase2Enabled || isDismissed) return null;

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500 animate-pulse" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Failed to generate suggestion
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="ghost" size="sm" onClick={generate}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No message yet
  if (!message) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            Suggested First Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={generate}>
            <Lightbulb className="h-4 w-4 mr-1" />
            Generate AI Suggestion
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Message preview (truncated to 2 lines)
  const truncatedMessage = message.length > 120 
    ? message.substring(0, 120) + '...' 
    : message;

  return (
    <Card className="bg-gradient-to-br from-yellow-500/5 to-amber-500/10 border-yellow-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="text-lg">✨</span>
            Suggested First Message
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={dismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dismiss suggestion</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Message Preview */}
        <div 
          className={cn(
            "bg-background/60 rounded-lg p-3 cursor-pointer transition-all",
            "hover:bg-background/80"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <p className={cn(
            "text-sm whitespace-pre-wrap",
            !isExpanded && "line-clamp-2"
          )}>
            {isExpanded ? message : truncatedMessage}
          </p>
          {message.length > 120 && (
            <button 
              className="text-xs text-primary mt-1 flex items-center gap-1 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Show more
                </>
              )}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onEditAndSend(message)}
          >
            <Send className="h-4 w-4 mr-1" />
            Edit & Send
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setHasGenerated(false);
                    generate();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate suggestion</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
