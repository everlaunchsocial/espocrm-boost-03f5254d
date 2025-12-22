import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateLead } from '@/hooks/useCRMData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeadPriorityToggleProps {
  leadId: string;
  priority: boolean;
  className?: string;
}

export function LeadPriorityToggle({ leadId, priority, className }: LeadPriorityToggleProps) {
  const [isPriority, setIsPriority] = useState(priority);
  const updateLead = useUpdateLead();

  const handleToggle = async () => {
    const newValue = !isPriority;
    setIsPriority(newValue); // Optimistic update

    try {
      await updateLead.mutateAsync({
        id: leadId,
        lead: { priority: newValue },
      });

      toast.success(newValue ? 'Marked as priority ✅' : 'Unmarked as priority 🚫');
    } catch (error) {
      setIsPriority(!newValue); // Revert on error
      toast.error('Failed to update priority');
      console.error('Error updating priority:', error);
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
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                isPriority
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground hover:text-yellow-400'
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isPriority ? 'Remove priority' : 'Mark this lead as a priority'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
