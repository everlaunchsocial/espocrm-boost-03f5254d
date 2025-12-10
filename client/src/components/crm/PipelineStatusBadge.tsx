import { getPipelineStatusConfig } from '@/lib/pipelineStatus';
import { cn } from '@/lib/utils';

interface PipelineStatusBadgeProps {
  status: string;
  className?: string;
}

export function PipelineStatusBadge({ status, className }: PipelineStatusBadgeProps) {
  const config = getPipelineStatusConfig(status);
  
  return (
    <span 
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
