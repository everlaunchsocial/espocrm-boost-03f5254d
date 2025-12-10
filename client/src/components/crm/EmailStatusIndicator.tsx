import { Mail, Eye, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmailStatusIndicatorProps {
  status: 'pending' | 'sent' | 'opened' | 'failed';
  openedAt?: string | null;
  openCount?: number;
  className?: string;
}

export function EmailStatusIndicator({ 
  status, 
  openedAt, 
  openCount = 0,
  className 
}: EmailStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          description: 'Email is being sent',
          colorClass: 'text-muted-foreground bg-muted',
        };
      case 'sent':
        return {
          icon: Mail,
          label: 'Sent',
          description: 'Email delivered, not yet opened',
          colorClass: 'text-chart-2 bg-chart-2/10',
        };
      case 'opened':
        return {
          icon: Eye,
          label: 'Opened',
          description: openedAt 
            ? `Opened ${formatDistanceToNow(new Date(openedAt), { addSuffix: true })}${openCount > 1 ? ` (${openCount} times)` : ''}`
            : 'Email has been opened',
          colorClass: 'text-success bg-success/10',
        };
      case 'failed':
        return {
          icon: AlertCircle,
          label: 'Failed',
          description: 'Email could not be delivered',
          colorClass: 'text-destructive bg-destructive/10',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
              config.colorClass,
              className
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
