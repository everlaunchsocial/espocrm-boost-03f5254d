import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLeadVoiceSummary } from '@/hooks/useLeadVoiceSummary';

interface InlineVoiceSummaryButtonProps {
  leadId: string;
  leadName: string;
}

export function InlineVoiceSummaryButton({ leadId, leadName }: InlineVoiceSummaryButtonProps) {
  const { isPlaying, isGenerating, hasData, playVoiceSummary } = useLeadVoiceSummary({
    leadId,
    leadName,
  });

  // Only show if there's data to summarize
  if (!hasData) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              playVoiceSummary();
            }}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isPlaying ? (
              <VolumeX className="h-4 w-4 text-primary" />
            ) : (
              <Volume2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{isPlaying ? 'Stop Voice Summary' : 'Play Voice Summary'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
