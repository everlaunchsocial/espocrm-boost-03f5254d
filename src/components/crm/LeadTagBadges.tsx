import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LeadTag } from '@/hooks/useLeadTags';
import { cn } from '@/lib/utils';

interface LeadTagBadgesProps {
  tags: LeadTag[];
  maxVisible?: number;
  size?: 'sm' | 'default';
  className?: string;
}

export function LeadTagBadges({ 
  tags, 
  maxVisible = 3, 
  size = 'sm',
  className 
}: LeadTagBadgesProps) {
  if (tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visibleTags.map((tag) => (
        <TooltipProvider key={tag.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={tag.is_ai_generated ? "outline" : "secondary"}
                className={cn(
                  "gap-1",
                  size === 'sm' && "text-[10px] px-1.5 py-0",
                  tag.is_ai_generated && "border-amber-500/50"
                )}
              >
                {tag.is_ai_generated && (
                  <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                )}
                <span className="truncate max-w-[80px]">{tag.tag_text}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tag.tag_text}</p>
              {tag.is_ai_generated && (
                <p className="text-xs text-muted-foreground">AI-generated tag</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={cn(
                size === 'sm' && "text-[10px] px-1.5 py-0"
              )}>
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {tags.slice(maxVisible).map((tag) => (
                  <p key={tag.id} className="text-sm">{tag.tag_text}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
