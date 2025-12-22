import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLeadIntents } from '@/hooks/useLeadIntents';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { getIntentTagConfig } from '@/lib/intentTags';
import { Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadIntentBadgesProps {
  leadId: string;
  compact?: boolean;
  maxVisible?: number;
  className?: string;
}

export function LeadIntentBadges({ 
  leadId, 
  compact = false, 
  maxVisible = 3,
  className 
}: LeadIntentBadgesProps) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');
  const { data: intents = [], isLoading } = useLeadIntents(leadId);

  if (!phase2Enabled || isLoading) {
    if (isLoading) return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    return null;
  }

  if (intents.length === 0) return null;

  const visibleIntents = intents.slice(0, maxVisible);
  const hiddenCount = intents.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visibleIntents.map((intent) => {
        const config = getIntentTagConfig(intent.tag);
        
        return (
          <TooltipProvider key={intent.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-xs gap-1 cursor-default',
                    config.color,
                    compact && 'px-1.5 py-0'
                  )}
                >
                  <span>{config.emoji}</span>
                  {!compact && <span>{config.label}</span>}
                  {intent.source === 'ai' && (
                    <Bot className="h-3 w-3 ml-0.5 opacity-60" />
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium">{config.emoji} {config.label}</p>
                  <p className="text-muted-foreground">
                    {intent.source === 'ai' ? 'AI-assigned' : 'Manually assigned'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                {intents.slice(maxVisible).map((intent) => {
                  const config = getIntentTagConfig(intent.tag);
                  return (
                    <p key={intent.id}>{config.emoji} {config.label}</p>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
