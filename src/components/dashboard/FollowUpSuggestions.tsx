import { useState, useEffect, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Clock, Eye, UserX, ChevronRight, RefreshCw, MessageSquare, Phone, Check, Loader2, CheckCircle2, Undo2, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useFollowUpSuggestions, SuggestionReason, FollowUpSuggestion } from '@/hooks/useFollowUpSuggestions';
import { useFollowUpResolutions } from '@/hooks/useFollowUpResolutions';
import { useFollowUpFeedback } from '@/hooks/useFollowUpFeedback';
import { useFollowupLearning } from '@/hooks/useFollowupLearning';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { isEnabled } = useFeatureFlags();
  const { data: suggestions, isLoading, error, refetch, isFetching } = useFollowUpSuggestions();
  const { logAccepted, confirmAction } = useFollowupLearning();
  const navigate = useNavigate();
  const [selectedSuggestion, setSelectedSuggestion] = useState<FollowUpSuggestion | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Regenerate throttle state
  const [regenerateCooldown, setRegenerateCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Feature flag check
  if (!isEnabled('aiCrmPhase1')) return null;

  const { isResolved, markAsResolved, markAllAsResolved, unmarkResolved } = useFollowUpResolutions();
  const { hasFeedback, getFeedback, submitFeedback } = useFollowUpFeedback();
  const [markAsDoneTarget, setMarkAsDoneTarget] = useState<FollowUpSuggestion | null>(null);
  const [showResolveAllDialog, setShowResolveAllDialog] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'helpful' | 'not_helpful' | 'not_rated'>('all');
  
  // Check if Phase 3 is enabled for Resolve All, Regenerate, Rating, and Filter
  const showResolveAll = isEnabled('aiCrmPhase2');
  const showRegenerate = isEnabled('aiCrmPhase2');
  const showRating = isEnabled('aiCrmPhase2');
  const showFeedbackFilter = isEnabled('aiCrmPhase2');

  // Filter suggestions based on feedback
  const filteredSuggestions = suggestions?.filter(suggestion => {
    if (feedbackFilter === 'all') return true;
    const feedback = getFeedback(suggestion.id);
    if (feedbackFilter === 'helpful') return feedback === 'helpful';
    if (feedbackFilter === 'not_helpful') return feedback === 'not_helpful';
    if (feedbackFilter === 'not_rated') return !hasFeedback(suggestion.id);
    return true;
  });

  const handleFeedback = (e: React.MouseEvent, suggestion: FollowUpSuggestion, feedback: 'helpful' | 'not_helpful') => {
    e.preventDefault();
    e.stopPropagation();
    if (hasFeedback(suggestion.id)) return;
    
    submitFeedback.mutate({
      suggestionKey: suggestion.id,
      leadId: suggestion.leadId,
      suggestionText: suggestion.suggestionText,
      feedback,
    });
  };

  const handleRegenerate = async () => {
    if (regenerateCooldown > 0 || isFetching) return;
    
    await refetch();
    toast.success('Suggestions updated');
    
    // Start 60-second cooldown
    setRegenerateCooldown(60);
    cooldownRef.current = setInterval(() => {
      setRegenerateCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const handleMarkAsDone = (e: React.MouseEvent, suggestion: FollowUpSuggestion) => {
    e.preventDefault();
    e.stopPropagation();
    setMarkAsDoneTarget(suggestion);
  };

  const confirmMarkAsDone = () => {
    if (markAsDoneTarget) {
      markAsResolved.mutate({
        suggestionKey: markAsDoneTarget.id,
        leadId: markAsDoneTarget.leadId,
      });
      setMarkAsDoneTarget(null);
    }
  };

  const handleResolveAll = () => {
    setShowResolveAllDialog(true);
  };

  const confirmResolveAll = () => {
    if (suggestions && suggestions.length > 0) {
      const unresolvedSuggestions = suggestions.filter(s => !isResolved(s.id));
      if (unresolvedSuggestions.length > 0) {
        markAllAsResolved.mutate(
          unresolvedSuggestions.map(s => ({
            suggestionKey: s.id,
            leadId: s.leadId,
          }))
        );
      }
    }
    setShowResolveAllDialog(false);
  };

  const handleUndo = (e: React.MouseEvent, suggestionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    unmarkResolved.mutate(suggestionId);
  };
  
  const handleActionClick = (e: React.MouseEvent, suggestion: FollowUpSuggestion) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSuggestion(suggestion);
    setIsConfirmed(false);
    setIsExecuting(false);
    
    // Log that the suggestion was accepted (clicked)
    logAccepted({
      suggestionText: suggestion.suggestionText,
      suggestionType: suggestion.reason,
      leadId: suggestion.leadId,
      demoId: suggestion.demoId,
    });
  };

  const executeResendDemo = async (suggestion: FollowUpSuggestion) => {
    if (!suggestion.demoId || !suggestion.email) {
      throw new Error('Missing demo or email information');
    }

    const { data, error } = await supabase.functions.invoke('send-demo-email', {
      body: {
        demoId: suggestion.demoId,
        toEmail: suggestion.email,
        toName: suggestion.name,
      },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Failed to resend demo');

    // Log activity
    await supabase.from('activities').insert({
      type: 'email',
      subject: `Demo resent to ${suggestion.name}`,
      description: `Follow-up demo email resent via suggested actions`,
      related_to_id: suggestion.leadId,
      related_to_type: 'lead',
      related_to_name: suggestion.name,
      is_system_generated: false,
    });

    return data;
  };

  const executeSendFollowUp = async (suggestion: FollowUpSuggestion) => {
    if (!suggestion.email) {
      throw new Error('No email address available');
    }

    const followUpSubject = `Following up on your AI demo`;
    const followUpBody = `
      <p>Hi ${suggestion.name.split(' ')[0]},</p>
      <p>I noticed you checked out the AI demo I sent over. I'd love to hear your thoughts!</p>
      <p>Do you have any questions about how it could work for ${suggestion.company || 'your business'}? I'm happy to walk through anything or customize it further.</p>
      <p>Let me know if you'd like to schedule a quick call.</p>
      <p>Best,<br/>Your EverLaunch Rep</p>
    `;

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        contactId: suggestion.leadId,
        senderAddress: 'info@send.everlaunch.ai',
        senderName: 'EverLaunch',
        toEmail: suggestion.email,
        toName: suggestion.name,
        subject: followUpSubject,
        body: followUpBody,
      },
    });

    if (error) throw error;

    // Log activity
    await supabase.from('activities').insert({
      type: 'email',
      subject: `Follow-up email sent to ${suggestion.name}`,
      description: `Post-demo follow-up email sent via suggested actions`,
      related_to_id: suggestion.leadId,
      related_to_type: 'lead',
      related_to_name: suggestion.name,
      is_system_generated: false,
    });

    return data;
  };

  const executeScheduleCall = async (suggestion: FollowUpSuggestion) => {
    // Navigate to lead detail with calendar tab or create a booking
    // For now, we'll navigate to the leads page with a note to schedule
    await supabase.from('activities').insert({
      type: 'task',
      subject: `Schedule call with ${suggestion.name}`,
      description: `Re-engagement call scheduled via suggested actions. Contact: ${suggestion.email || suggestion.phone || 'See lead details'}`,
      related_to_id: suggestion.leadId,
      related_to_type: 'lead',
      related_to_name: suggestion.name,
      is_system_generated: false,
    });

    return { navigateToLead: true };
  };

  const handleConfirm = async () => {
    if (!selectedSuggestion) return;

    setIsExecuting(true);

    try {
      let result;
      
      switch (selectedSuggestion.reason) {
        case 'demo_not_viewed':
          result = await executeResendDemo(selectedSuggestion);
          toast.success('Demo resent', { description: `Email sent to ${selectedSuggestion.email}` });
          break;
        case 'demo_viewed_no_reply':
          result = await executeSendFollowUp(selectedSuggestion);
          toast.success('Follow-up sent', { description: `Email sent to ${selectedSuggestion.email}` });
          break;
        case 'lead_inactive':
          result = await executeScheduleCall(selectedSuggestion);
          toast.success('Call scheduled', { description: `Task created for ${selectedSuggestion.name}` });
          if (result?.navigateToLead) {
            // Mark as confirmed before navigating
            confirmAction({
              suggestionText: selectedSuggestion.suggestionText,
              suggestionType: selectedSuggestion.reason,
            });
            setSelectedSuggestion(null);
            navigate(`/leads?selected=${selectedSuggestion.leadId}`);
            return;
          }
          break;
      }

      // Mark the action as confirmed in the learning log
      confirmAction({
        suggestionText: selectedSuggestion.suggestionText,
        suggestionType: selectedSuggestion.reason,
      });

      setIsConfirmed(true);
      
      // Refetch suggestions after action
      setTimeout(() => {
        refetch();
        setSelectedSuggestion(null);
        setIsConfirmed(false);
      }, 1500);

    } catch (err) {
      console.error('Error executing action:', err);
      toast.error('Action failed', { 
        description: err instanceof Error ? err.message : 'Please try again' 
      });
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    setSelectedSuggestion(null);
    setIsConfirmed(false);
    setIsExecuting(false);
  };

  const getChannelForSuggestion = (suggestion: FollowUpSuggestion): string => {
    // Prefer SMS if phone available and no email, otherwise default to email
    if (suggestion.reason === 'lead_inactive') {
      return 'Phone';
    }
    if (suggestion.email) {
      return 'Email';
    }
    if (suggestion.phone) {
      return 'SMS';
    }
    return 'Email';
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Follow-Up Suggestions
            </CardTitle>
            <div className="flex items-center gap-2">
              {showFeedbackFilter && suggestions && suggestions.length > 0 && (
                <Select value={feedbackFilter} onValueChange={(v) => setFeedbackFilter(v as typeof feedbackFilter)}>
                  <SelectTrigger className="h-7 w-[130px] text-xs">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suggestions</SelectItem>
                    <SelectItem value="helpful">Rated Helpful</SelectItem>
                    <SelectItem value="not_helpful">Not Helpful</SelectItem>
                    <SelectItem value="not_rated">Not Yet Rated</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {showRegenerate && suggestions && suggestions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleRegenerate}
                  disabled={regenerateCooldown > 0 || isFetching}
                  title="Refresh AI follow-up suggestions based on recent activity"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                  {regenerateCooldown > 0 ? `${regenerateCooldown}s` : 'Regenerate'}
                </Button>
              )}
              {showResolveAll && suggestions && suggestions.length > 0 && suggestions.some(s => !isResolved(s.id)) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleResolveAll}
                  title="Mark all follow-up suggestions as done"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Resolve All
                </Button>
              )}
            </div>
          </div>
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
          ) : filteredSuggestions && filteredSuggestions.length > 0 ? (
            <ul className="space-y-3">
              {filteredSuggestions.map((suggestion) => {
                const config = reasonConfig[suggestion.reason];
                const action = actionConfig[suggestion.reason];
                const Icon = config.icon;
                const ActionIcon = action.icon;
                const resolved = isResolved(suggestion.id);

                return (
                  <li key={suggestion.id}>
                    <Link
                      to={`/leads?selected=${suggestion.leadId}`}
                      className={cn(
                        "flex items-start gap-3 p-3 -mx-3 rounded-lg transition-colors group",
                        resolved 
                          ? "opacity-60 bg-muted/30" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn("mt-0.5", resolved ? "text-muted-foreground" : config.color)}>
                        {resolved ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-medium truncate",
                            resolved ? "text-muted-foreground line-through" : "text-foreground"
                          )}>
                            {suggestion.name}
                          </span>
                          {suggestion.company && (
                            <span className="text-sm text-muted-foreground truncate">
                              · {suggestion.company}
                            </span>
                          )}
                          {resolved && (
                            <Badge variant="outline" className="text-xs font-normal text-success border-success/30">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant={resolved ? "outline" : config.badgeVariant} className="text-xs font-normal">
                            {suggestion.reasonLabel}
                          </Badge>
                          {/* Rating buttons */}
                          {showRating && !resolved && (
                            <div className="flex items-center gap-1 ml-1">
                              {hasFeedback(suggestion.id) ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  {getFeedback(suggestion.id) === 'helpful' ? (
                                    <ThumbsUp className="h-3 w-3 text-success" />
                                  ) : (
                                    <ThumbsDown className="h-3 w-3 text-destructive" />
                                  )}
                                  Rated
                                </span>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-50 hover:opacity-100"
                                    onClick={(e) => handleFeedback(e, suggestion, 'helpful')}
                                    title="Helpful"
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-50 hover:opacity-100"
                                    onClick={(e) => handleFeedback(e, suggestion, 'not_helpful')}
                                    title="Not helpful"
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.suggestionText}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {resolved ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                            onClick={(e) => handleUndo(e, suggestion.id)}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Undo
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleMarkAsDone(e, suggestion)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Done
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleActionClick(e, suggestion)}
                            >
                              <ActionIcon className="h-4 w-4 mr-1" />
                              {action.label}
                            </Button>
                          </>
                        )}
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
                {selectedSuggestion.email && (
                  <p className="text-sm text-muted-foreground">{selectedSuggestion.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Channel</p>
                <p className="text-foreground">{getChannelForSuggestion(selectedSuggestion)}</p>
              </div>
            </div>
          )}
          {isConfirmed && (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
                <Check className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {selectedSuggestion?.reason === 'demo_not_viewed' && 'Demo resent!'}
                {selectedSuggestion?.reason === 'demo_viewed_no_reply' && 'Follow-up sent!'}
                {selectedSuggestion?.reason === 'lead_inactive' && 'Call scheduled!'}
              </p>
            </div>
          )}
          {!isConfirmed && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleCancel} disabled={isExecuting}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isExecuting}>
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Done Confirmation */}
      <AlertDialog open={!!markAsDoneTarget} onOpenChange={(open) => !open && setMarkAsDoneTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark follow-up as complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the follow-up for {markAsDoneTarget?.name} as resolved. 
              The suggestion will remain visible but grayed out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkAsDone}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolve All Confirmation */}
      <AlertDialog open={showResolveAllDialog} onOpenChange={setShowResolveAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve All Suggestions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all follow-up suggestions as done. No messages will be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResolveAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}