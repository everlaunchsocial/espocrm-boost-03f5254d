import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Clock, Eye, UserX, ChevronRight, RefreshCw, MessageSquare, Phone, Check } from 'lucide-react';
import { useFollowUpSuggestions, SuggestionReason, FollowUpSuggestion } from '@/hooks/useFollowUpSuggestions';
import { Link } from 'react-router-dom';

const reasonConfig: Record<SuggestionReason, { icon: typeof Clock; color: string; badgeVariant: 'destructive' | 'secondary' | 'outline' }> = {
  demo_not_viewed: {
    icon: Eye,
    color: 'text-destructive',
    badgeVariant: 'destructive',
  },
  demo_viewed_no_reply: {
    icon: Clock,
    color: 'text-warning',
    badgeVariant: 'secondary',
  },
  lead_inactive: {
    icon: UserX,
    color: 'text-muted-foreground',
    badgeVariant: 'outline',
  },
};

const actionConfig: Record<SuggestionReason, { label: string; icon: typeof RefreshCw; channel: string }> = {
  demo_not_viewed: {
    label: 'Resend demo',
    icon: RefreshCw,
    channel: 'Email',
  },
  demo_viewed_no_reply: {
    label: 'Send follow-up',
    icon: MessageSquare,
    channel: 'Email',
  },
  lead_inactive: {
    label: 'Schedule call',
    icon: Phone,
    channel: 'Phone',
  },
};

export function FollowUpSuggestions() {
  const { data: suggestions, isLoading, error } = useFollowUpSuggestions();
  const [selectedSuggestion, setSelectedSuggestion] = useState<FollowUpSuggestion | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleActionClick = (e: React.MouseEvent, suggestion: FollowUpSuggestion) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSuggestion(suggestion);
    setIsConfirmed(false);
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
    setTimeout(() => {
      setSelectedSuggestion(null);
      setIsConfirmed(false);
    }, 1500);
  };

  const handleCancel = () => {
    setSelectedSuggestion(null);
    setIsConfirmed(false);
  };

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Follow-Up Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Follow-Up Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <ul className="space-y-3">
              {suggestions.map((suggestion) => {
                const config = reasonConfig[suggestion.reason];
                const action = actionConfig[suggestion.reason];
                const Icon = config.icon;
                const ActionIcon = action.icon;

                return (
                  <li key={suggestion.id}>
                    <Link
                      to={`/leads?selected=${suggestion.leadId}`}
                      className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className={`mt-0.5 ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground truncate">
                            {suggestion.name}
                          </span>
                          {suggestion.company && (
                            <span className="text-sm text-muted-foreground truncate">
                              · {suggestion.company}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant={config.badgeVariant} className="text-xs font-normal">
                            {suggestion.reasonLabel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.suggestionText}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleActionClick(e, suggestion)}
                        >
                          <ActionIcon className="h-4 w-4 mr-1" />
                          {action.label}
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
                <AlertCircle className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No urgent follow-ups needed right now.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSuggestion} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Review the details before confirming.
            </DialogDescription>
          </DialogHeader>
          {selectedSuggestion && !isConfirmed && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Summary</p>
                <p className="text-foreground">
                  {actionConfig[selectedSuggestion.reason].label} to {selectedSuggestion.name}
                  {selectedSuggestion.company && ` (${selectedSuggestion.company})`}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Target</p>
                <p className="text-foreground">
                  {selectedSuggestion.name}
                  {selectedSuggestion.company && ` - ${selectedSuggestion.company}`}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Channel</p>
                <p className="text-foreground">{actionConfig[selectedSuggestion.reason].channel}</p>
              </div>
            </div>
          )}
          {isConfirmed && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
                <Check className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-foreground">Confirmed. Preparing message…</p>
            </div>
          )}
          {!isConfirmed && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                Confirm
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
