import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Eye, UserX, CheckCircle2, Filter, Plus, Phone, MessageSquare, Mail, Video, Pencil } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFollowUpSuggestions, SuggestionReason } from '@/hooks/useFollowUpSuggestions';
import { useFollowUpResolutions } from '@/hooks/useFollowUpResolutions';
import { useManualFollowUps, ManualFollowUp } from '@/hooks/useManualFollowUps';
import { AddManualFollowUpModal } from './AddManualFollowUpModal';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FollowUpHistoryTabProps {
  leadId: string;
}

type StatusFilter = 'all' | 'active' | 'resolved';

const reasonIcons: Record<SuggestionReason, typeof Clock> = {
  demo_not_viewed: Eye,
  demo_viewed_no_reply: Clock,
  lead_inactive: UserX,
};

const reasonLabels: Record<SuggestionReason, string> = {
  demo_not_viewed: 'Demo Sent (Unviewed)',
  demo_viewed_no_reply: 'Demo Viewed (No Reply)',
  lead_inactive: 'Lead Inactive',
};

const manualTypeIcons: Record<string, typeof Clock> = {
  call_reminder: Phone,
  send_text: MessageSquare,
  email_follow_up: Mail,
  re_send_demo: Video,
  custom: Pencil,
};

const manualTypeLabels: Record<string, string> = {
  call_reminder: 'Call Reminder',
  send_text: 'Send Text',
  email_follow_up: 'Email Follow-Up',
  re_send_demo: 'Re-send Demo',
  custom: 'Custom',
};

export function FollowUpHistoryTab({ leadId }: FollowUpHistoryTabProps) {
  const { data: allSuggestions = [], isLoading: suggestionsLoading } = useFollowUpSuggestions();
  const { resolutions, isResolved } = useFollowUpResolutions();
  const { manualFollowUps, isLoading: manualLoading } = useManualFollowUps(leadId);
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const isLoading = suggestionsLoading || manualLoading;

  // Filter suggestions for this lead
  const leadSuggestions = useMemo(() => {
    return allSuggestions.filter(s => s.leadId === leadId);
  }, [allSuggestions, leadId]);

  // Get resolution data for resolved items
  const getResolutionTime = (suggestionId: string) => {
    const resolution = resolutions.find(r => r.suggestion_key === suggestionId);
    return resolution?.resolved_at ? new Date(resolution.resolved_at) : null;
  };

  // Filter manual follow-ups by status
  const filteredManualFollowUps = useMemo(() => {
    if (statusFilter === 'all') return manualFollowUps;
    if (statusFilter === 'active') return manualFollowUps.filter(m => m.status === 'active');
    if (statusFilter === 'resolved') return manualFollowUps.filter(m => m.status === 'resolved');
    return manualFollowUps;
  }, [manualFollowUps, statusFilter]);

  // Apply status filter to AI suggestions
  const filteredSuggestions = useMemo(() => {
    if (statusFilter === 'all') return leadSuggestions;
    if (statusFilter === 'active') return leadSuggestions.filter(s => !isResolved(s.id));
    if (statusFilter === 'resolved') return leadSuggestions.filter(s => isResolved(s.id));
    return leadSuggestions;
  }, [leadSuggestions, statusFilter, isResolved]);

  // Combine and sort all follow-ups
  type CombinedItem = 
    | { type: 'ai'; data: typeof leadSuggestions[0] }
    | { type: 'manual'; data: ManualFollowUp };

  const combinedItems = useMemo((): CombinedItem[] => {
    const aiItems: CombinedItem[] = filteredSuggestions.map(s => ({ type: 'ai' as const, data: s }));
    const manualItems: CombinedItem[] = filteredManualFollowUps.map(m => ({ type: 'manual' as const, data: m }));
    
    return [...aiItems, ...manualItems].sort((a, b) => {
      const aTime = a.type === 'ai' ? a.data.timestamp.getTime() : new Date(a.data.triggered_at).getTime();
      const bTime = b.type === 'ai' ? b.data.timestamp.getTime() : new Date(b.data.triggered_at).getTime();
      return bTime - aTime;
    });
  }, [filteredSuggestions, filteredManualFollowUps]);

  const totalCount = combinedItems.length;

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-2">
            {totalCount} item{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Manual Follow-Up
        </Button>
      </div>

      {/* Combined Follow-Up List */}
      {combinedItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No follow-up history for this lead</p>
        </div>
      ) : (
        <div className="space-y-2">
          {combinedItems.map((item) => {
            if (item.type === 'ai') {
              const suggestion = item.data;
              const resolved = isResolved(suggestion.id);
              const resolvedAt = getResolutionTime(suggestion.id);
              const Icon = reasonIcons[suggestion.reason];

              return (
                <div
                  key={`ai-${suggestion.id}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    resolved 
                      ? "bg-muted/30 border-border/50 opacity-70" 
                      : "bg-card border-border"
                  )}
                >
                  <div className={cn(
                    "mt-0.5",
                    resolved ? "text-muted-foreground" : "text-primary"
                  )}>
                    {resolved ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium text-sm",
                        resolved ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {reasonLabels[suggestion.reason]}
                      </span>
                      <Badge variant="outline" className="text-xs">AI</Badge>
                      <Badge 
                        variant={resolved ? "outline" : "secondary"} 
                        className={cn(
                          "text-xs",
                          resolved && "text-success border-success/30"
                        )}
                      >
                        {resolved ? 'Resolved' : 'Active'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {suggestion.suggestionText}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        Triggered: {format(suggestion.timestamp, 'MMM d, yyyy h:mm a')}
                      </span>
                      {resolved && resolvedAt && (
                        <span>
                          Resolved: {format(resolvedAt, 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              const manual = item.data;
              const resolved = manual.status === 'resolved';
              const ManualIcon = manualTypeIcons[manual.type] || Pencil;

              return (
                <div
                  key={`manual-${manual.id}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    resolved 
                      ? "bg-muted/30 border-border/50 opacity-70" 
                      : "bg-card border-border"
                  )}
                >
                  <div className={cn(
                    "mt-0.5",
                    resolved ? "text-muted-foreground" : "text-primary"
                  )}>
                    {resolved ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <ManualIcon className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium text-sm",
                        resolved ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {manualTypeLabels[manual.type] || manual.type}
                      </span>
                      <Badge variant="outline" className="text-xs">Manual</Badge>
                      <Badge 
                        variant={resolved ? "outline" : "secondary"} 
                        className={cn(
                          "text-xs",
                          resolved && "text-success border-success/30"
                        )}
                      >
                        {resolved ? 'Resolved' : 'Active'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {manual.summary}
                    </p>

                    {manual.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {manual.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        Triggered: {format(new Date(manual.triggered_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {resolved && manual.resolved_at && (
                        <span>
                          Resolved: {format(new Date(manual.resolved_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Add Manual Follow-Up Modal */}
      <AddManualFollowUpModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        leadId={leadId}
      />
    </div>
  );
}
