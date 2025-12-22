import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateLead } from '@/hooks/useCRMData';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Bot, Hand, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DoneForYouToggleProps {
  leadId: string;
  doneForYou: boolean;
  className?: string;
}

export function DoneForYouToggle({ leadId, doneForYou, className }: DoneForYouToggleProps) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');
  const updateLead = useUpdateLead();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!phase2Enabled) return null;

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await updateLead.mutateAsync({
        id: leadId,
        lead: { doneForYou: checked },
      });
      toast.success(
        checked 
          ? "Done For You mode enabled — we'll handle this lead for you" 
          : "Manual mode enabled — you're in control"
      );
    } catch (error) {
      toast.error('Failed to update mode');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {doneForYou ? (
                  <Bot className="h-4 w-4 text-primary" />
                ) : (
                  <Hand className="h-4 w-4 text-muted-foreground" />
                )}
                <Label 
                  htmlFor="dfy-toggle" 
                  className="text-sm font-medium cursor-pointer"
                >
                  {doneForYou ? 'Done For You' : 'Manual Mode'}
                </Label>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">
                <strong>Done For You:</strong> EverLaunch AI handles follow-ups, demos, and nudges on your behalf.
                <br /><br />
                <strong>Manual:</strong> You take action yourself using the timeline and tools.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-2">
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id="dfy-toggle"
              checked={doneForYou}
              onCheckedChange={handleToggle}
              disabled={isUpdating}
            />
          )}
        </div>
      </div>

      {/* Contextual note */}
      <div className={cn(
        'text-xs px-2 py-1.5 rounded-md',
        doneForYou 
          ? 'bg-primary/10 text-primary' 
          : 'bg-muted text-muted-foreground'
      )}>
        {doneForYou ? (
          <span className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            We'll handle this lead for you.
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Hand className="h-3 w-3" />
            You're in control — use the timeline and tools below.
          </span>
        )}
      </div>
    </div>
  );
}

// Compact badge version for lists/timeline
export function DoneForYouBadge({ doneForYou }: { doneForYou: boolean }) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  if (!phase2Enabled || !doneForYou) return null;

  return (
    <Badge 
      variant="secondary" 
      className="bg-primary/10 text-primary text-xs gap-1"
    >
      <Bot className="h-3 w-3" />
      DFY Mode
    </Badge>
  );
}
