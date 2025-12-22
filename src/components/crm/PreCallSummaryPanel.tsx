import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePreCallSummary } from '@/hooks/usePreCallSummary';
import { useLeadTags } from '@/hooks/useLeadTags';
import { Lead } from '@/types/crm';
import { 
  Phone, 
  FileText, 
  Activity, 
  AlertTriangle, 
  Eye,
  Loader2,
  User,
  Building2,
  Globe,
  Clock,
  MessageSquare,
  Video,
  Mail,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface PreCallSummaryPanelProps {
  lead: Lead;
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  voice_call: Phone,
  demo_view: Video,
  demo_watched: Video,
  email: Mail,
  meeting: Calendar,
};

export function PreCallSummaryPanel({ lead }: PreCallSummaryPanelProps) {
  const { notes, activities, demoStatus, followUps, isLoading } = usePreCallSummary(lead.id);
  const { tags } = useLeadTags(lead.id);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading pre-call summary...</span>
      </div>
    );
  }

  const formatTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium">Pre-Call Summary</h4>
      </div>

      {/* Lead Overview */}
      <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Lead Overview</span>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{lead.firstName} {lead.lastName}</span>
            <Badge variant="outline" className="text-xs">
              {lead.status}
            </Badge>
          </div>
          
          {lead.company && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{lead.company}</span>
            </div>
          )}
          
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.slice(0, 4).map(tag => (
                <Badge key={tag.id} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag.tag_text}
                </Badge>
              ))}
              {tags.length > 4 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{tags.length - 4}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Notes */}
      {notes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>Recent Notes</span>
          </div>
          
          <div className="space-y-1.5">
            {notes.map(note => (
              <TooltipProvider key={note.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 bg-muted/20 rounded text-xs cursor-default">
                      <p className="line-clamp-2 text-muted-foreground">{note.content}</p>
                      <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                        {formatTimeAgo(note.createdAt)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs whitespace-pre-wrap">{note.content}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>Recent Activity</span>
          </div>
          
          <div className="space-y-1.5">
            {activities.map(activity => {
              const Icon = ACTIVITY_ICONS[activity.type] || MessageSquare;
              return (
                <div key={activity.id} className="flex items-start gap-2 p-2 bg-muted/20 rounded text-xs">
                  <Icon className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-muted-foreground">{activity.summary}</p>
                    <span className="text-[10px] text-muted-foreground/70">
                      {formatTimeAgo(activity.eventAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Follow-Up Flags */}
      {followUps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            <span>Follow-Up Flags</span>
          </div>
          
          <div className="space-y-1.5">
            {followUps.map(followUp => (
              <div 
                key={followUp.id} 
                className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs"
              >
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {followUp.reason}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {followUp.suggestionText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo View Status */}
      {demoStatus && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>Demo Status</span>
          </div>
          
          <div className="p-2 bg-muted/20 rounded text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Demo</span>
              <span className="font-medium">{demoStatus.businessName}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sent</span>
              {demoStatus.sent ? (
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  No
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Viewed</span>
              {demoStatus.viewed ? (
                <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  No
                </Badge>
              )}
            </div>
            
            {demoStatus.progressPercent !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{demoStatus.progressPercent}%</span>
              </div>
            )}
            
            {demoStatus.viewedAt && (
              <div className="text-[10px] text-muted-foreground/70 mt-1">
                Viewed {formatTimeAgo(demoStatus.viewedAt)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {notes.length === 0 && activities.length === 0 && !demoStatus && followUps.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No recent activity or notes for this lead.
        </p>
      )}
    </div>
  );
}
