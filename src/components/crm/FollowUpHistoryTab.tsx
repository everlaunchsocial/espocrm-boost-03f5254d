import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Eye, UserX, CheckCircle2, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFollowUpSuggestions, SuggestionReason, FollowUpSuggestion } from '@/hooks/useFollowUpSuggestions';
import { useFollowUpResolutions } from '@/hooks/useFollowUpResolutions';
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

export function FollowUpHistoryTab({ leadId }: FollowUpHistoryTabProps) {
  const { data: allSuggestions = [], isLoading } = useFollowUpSuggestions();
  const { resolutions, isResolved } = useFollowUpResolutions();
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Filter suggestions for this lead
  const leadSuggestions = useMemo(() => {
    return allSuggestions.filter(s => s.leadId === leadId);
  }, [allSuggestions, leadId]);

  // Get resolution data for resolved items
  const getResolutionTime = (suggestionId: string) => {
    const resolution = resolutions.find(r => r.suggestion_key === suggestionId);
    return resolution?.resolved_at ? new Date(resolution.resolved_at) : null;
  };

  // Apply status filter
  const filteredSuggestions = useMemo(() => {
    if (statusFilter === 'all') return leadSuggestions;
    if (statusFilter === 'active') return leadSuggestions.filter(s => !isResolved(s.id));
    if (statusFilter === 'resolved') return leadSuggestions.filter(s => isResolved(s.id));
    return leadSuggestions;
  }, [leadSuggestions, statusFilter, isResolved]);

  // Sort by timestamp descending
  const sortedSuggestions = useMemo(() => {
    return [...filteredSuggestions].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [filteredSuggestions]);

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
      {/* Filters */}
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
          {sortedSuggestions.length} suggestion{sortedSuggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Suggestion List */}
      {sortedSuggestions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No follow-up history for this lead</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedSuggestions.map((suggestion) => {
            const resolved = isResolved(suggestion.id);
            const resolvedAt = getResolutionTime(suggestion.id);
            const Icon = reasonIcons[suggestion.reason];

            return (
              <div
                key={suggestion.id}
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
          })}
        </div>
      )}
    </div>
  );
}
