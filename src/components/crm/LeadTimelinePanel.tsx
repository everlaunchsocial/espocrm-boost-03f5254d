import { useMemo, useState } from 'react';
import { useLeadTimeline, LeadTimelineEvent } from '@/hooks/useLeadTimeline';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { formatDistanceToNow, isToday, isYesterday, format, parseISO, startOfDay } from 'date-fns';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar, 
  Mic, 
  Presentation, 
  ArrowRight,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Send
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface LeadTimelinePanelProps {
  leadId: string;
  onSendFollowUp?: (demoId: string) => void;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  voice_call: Mic,
  demo_view: Presentation,
  demo_watched: Eye,
  followup: ArrowRight,
  task: FileText,
  'status-change': FileText,
};

const EVENT_COLORS: Record<string, string> = {
  note: 'bg-blue-500/10 text-blue-500',
  call: 'bg-green-500/10 text-green-500',
  email: 'bg-purple-500/10 text-purple-500',
  meeting: 'bg-orange-500/10 text-orange-500',
  voice_call: 'bg-emerald-500/10 text-emerald-500',
  demo_view: 'bg-pink-500/10 text-pink-500',
  demo_watched: 'bg-indigo-500/10 text-indigo-500',
  followup: 'bg-yellow-500/10 text-yellow-500',
  task: 'bg-slate-500/10 text-slate-500',
  'status-change': 'bg-cyan-500/10 text-cyan-500',
};

const EVENT_LABELS: Record<string, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  voice_call: 'Voice Call',
  demo_view: 'Demo',
  demo_watched: 'Watched Demo',
  followup: 'Follow-up',
  task: 'Task',
  'status-change': 'Status Change',
};

function formatGroupLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d, yyyy');
}

interface TimelineItemProps {
  event: LeadTimelineEvent;
  onSendFollowUp?: (demoId: string) => void;
}

function TimelineItem({ event, onSendFollowUp }: TimelineItemProps) {
  const Icon = EVENT_ICONS[event.event_type] || FileText;
  const colorClass = EVENT_COLORS[event.event_type] || 'bg-muted text-muted-foreground';
  const label = EVENT_LABELS[event.event_type] || event.event_type;
  
  const eventDate = parseISO(event.event_at);
  const relativeTime = formatDistanceToNow(eventDate, { addSuffix: true });

  // Extract metadata for display
  const metadata = event.metadata || {};
  const durationSeconds = metadata.duration_seconds as number | undefined;
  const viewCount = metadata.view_count as number | undefined;
  const accepted = metadata.accepted as boolean | undefined;
  const confirmed = metadata.confirmed as boolean | undefined;
  const progressPercent = metadata.progress_percent as number | undefined;
  const demoId = metadata.demo_id as string | undefined;
  const watchDurationSeconds = metadata.watch_duration_seconds as number | undefined;

  // Special rendering for demo_watched events
  const isDemoWatched = event.event_type === 'demo_watched';

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-0">
      {/* Icon */}
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
        {isDemoWatched ? (
          <span className="text-base">👁️</span>
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{event.summary}</p>
            {isDemoWatched && progressPercent !== undefined ? (
              <p className="text-xs text-muted-foreground mt-1">
                Viewed {progressPercent}% of the demo
                {event.preview_content && ` • ${event.preview_content}`}
              </p>
            ) : event.preview_content ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {event.preview_content}
              </p>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {relativeTime}
          </span>
        </div>

        {/* Tags/Metadata */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge variant="outline" className="text-xs">
            {label}
          </Badge>
          
          {durationSeconds && (
            <Badge variant="secondary" className="text-xs">
              {Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s
            </Badge>
          )}

          {isDemoWatched && watchDurationSeconds && watchDurationSeconds > 0 && (
            <Badge variant="secondary" className="text-xs">
              {Math.floor(watchDurationSeconds / 60)}m {watchDurationSeconds % 60}s watched
            </Badge>
          )}
          
          {viewCount !== undefined && viewCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {viewCount} view{viewCount !== 1 ? 's' : ''}
            </Badge>
          )}
          
          {event.event_type === 'followup' && (
            <>
              {accepted && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCircle className="h-3 w-3" /> Accepted
                </Badge>
              )}
              {confirmed && (
                <Badge className="text-xs gap-1 bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  <CheckCircle className="h-3 w-3" /> Confirmed
                </Badge>
              )}
              {accepted === false && (
                <Badge variant="secondary" className="text-xs gap-1 text-muted-foreground">
                  <XCircle className="h-3 w-3" /> Dismissed
                </Badge>
              )}
            </>
          )}

          {/* CTA for demo_watched */}
          {isDemoWatched && demoId && onSendFollowUp && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 text-xs ml-auto"
              onClick={() => onSendFollowUp(demoId)}
            >
              <Send className="h-3 w-3 mr-1" />
              Send Follow-Up
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LeadTimelinePanel({ leadId, onSendFollowUp }: LeadTimelinePanelProps) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');
  
  const { data: events = [], isLoading, error } = useLeadTimeline(leadId);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups: Map<string, LeadTimelineEvent[]> = new Map();
    
    events.forEach((event) => {
      const eventDate = parseISO(event.event_at);
      const dayKey = startOfDay(eventDate).toISOString();
      
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)!.push(event);
    });

    return Array.from(groups.entries()).map(([dayKey, dayEvents]) => ({
      date: parseISO(dayKey),
      label: formatGroupLabel(parseISO(dayKey)),
      events: dayEvents,
    }));
  }, [events]);

  if (!phase2Enabled) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-sm text-destructive">
        Failed to load timeline
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {groupedEvents.map((group) => (
          <div key={group.label}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 bg-background py-1">
              {group.label}
            </h4>
            <div className="space-y-0">
              {group.events.map((event) => (
                <TimelineItem key={event.id} event={event} onSendFollowUp={onSendFollowUp} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
