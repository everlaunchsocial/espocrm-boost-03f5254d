import { Phone, Eye, Send, FileText, Calendar, Mail, Mic, RefreshCw, Sparkles } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TimelineHighlight, useTimelineHighlights } from '@/hooks/useTimelineHighlights';
import { Skeleton } from '@/components/ui/skeleton';

interface TimelineHighlightsProps {
  leadId: string;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  voice_call: Mic,
  demo_view: Eye,
  demo_watched: Eye,
  followup: Send,
  note: FileText,
  email: Mail,
  meeting: Calendar,
  task: FileText,
  'status-change': FileText,
};

const EVENT_COLORS: Record<string, string> = {
  call: 'bg-green-500/10 text-green-600 border-green-500/20',
  voice_call: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  demo_view: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  demo_watched: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  followup: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  note: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  email: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  meeting: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  task: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'status-change': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

function HighlightBubble({ highlight }: { highlight: TimelineHighlight }) {
  const Icon = EVENT_ICONS[highlight.event_type] || FileText;
  const colorClass = EVENT_COLORS[highlight.event_type] || 'bg-muted text-muted-foreground border-border';
  const relativeTime = formatDistanceToNow(parseISO(highlight.created_at), { addSuffix: true });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-full border',
              'min-w-[200px] max-w-[300px] cursor-default',
              'animate-in fade-in slide-in-from-left-2 duration-300',
              colorClass
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate flex-1">
              {highlight.summary}
            </span>
            <span className="text-xs opacity-60 whitespace-nowrap flex-shrink-0">
              {relativeTime}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[350px]">
          <p className="text-sm">{highlight.summary}</p>
          <p className="text-xs text-muted-foreground mt-1">Generated {relativeTime}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TimelineHighlights({ leadId }: TimelineHighlightsProps) {
  const { highlights, isLoading, refreshAll } = useTimelineHighlights(leadId);

  if (isLoading && highlights.length === 0) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            AI Highlights
          </span>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-48 rounded-full" />
          <Skeleton className="h-10 w-56 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </div>
    );
  }

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            AI Highlights
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => refreshAll()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {highlights.map((highlight, index) => (
            <div
              key={highlight.id}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <HighlightBubble highlight={highlight} />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
