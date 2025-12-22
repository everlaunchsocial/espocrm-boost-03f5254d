import { useState } from 'react';
import { BellOff, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateLead } from '@/hooks/useCRMData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeadQuietModeToggleProps {
  leadId: string;
  quietMode: boolean;
  className?: string;
}

export function LeadQuietModeToggle({ leadId, quietMode, className }: LeadQuietModeToggleProps) {
  const [isQuiet, setIsQuiet] = useState(quietMode);
  const updateLead = useUpdateLead();

  const handleToggle = async () => {
    const newValue = !isQuiet;
    setIsQuiet(newValue); // Optimistic update

    try {
      await updateLead.mutateAsync({
        id: leadId,
        lead: { quietMode: newValue },
      });

      toast.success(
        newValue 
          ? 'Quiet Mode enabled for this lead 🔕' 
          : 'Quiet Mode disabled 🔔'
      );
    } catch (error) {
      setIsQuiet(!newValue); // Revert on error
      toast.error('Failed to update quiet mode');
      console.error('Error updating quiet mode:', error);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', className)}
            onClick={handleToggle}
            disabled={updateLead.isPending}
          >
            {isQuiet ? (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isQuiet 
              ? 'Quiet Mode is ON — AI suggestions paused' 
              : 'Temporarily pause AI follow-up suggestions for this lead'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
