import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import { AlertCircle, Clock, Eye, UserX, ChevronRight, RefreshCw, MessageSquare, Phone, Check, Loader2, CheckCircle2, Undo2, Trash2, ThumbsUp, ThumbsDown, CheckCheck, Bot, Timer, XCircle, Pause, Play } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFollowUpSuggestions, SuggestionReason, FollowUpSuggestion } from '@/hooks/useFollowUpSuggestions';
import { useFollowUpResolutions } from '@/hooks/useFollowUpResolutions';
import { useFollowUpFeedback } from '@/hooks/useFollowUpFeedback';
import { useFollowupLearning } from '@/hooks/useFollowupLearning';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useScheduledFollowUps, useAutoSendMode } from '@/hooks/useScheduledFollowUps';
import { useContactWindowSuggestions } from '@/hooks/useContactWindowSuggestions';
import { calculateOptimalSendTime, formatTimeUntil } from '@/lib/scheduleOptimalTime';
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
  const phase1Enabled = isEnabled('aiCrmPhase1');
  const phase4Enabled = isEnabled('aiCrmPhase4');
  const autoSendEnabled = isEnabled('aiCrmPhase4AutoSend');

  const { data: suggestions, isLoading, error, refetch, isFetching } = useFollowUpSuggestions();
  const { logAccepted, confirmAction } = useFollowupLearning();
  const { isResolved, markAsResolved, markAllAsResolved, unmarkResolved } = useFollowUpResolutions();
  const { hasFeedback, getFeedback, submitFeedback } = useFollowUpFeedback();
  
  // Auto-send mode hooks
  const { 
    scheduledFollowUps, 
    scheduleFollowUp, 
    cancelScheduledFollowUp, 
    isScheduled, 
    getScheduledItem 
  } = useScheduledFollowUps();
  const { 
    isEnabled: autoSendModeEnabled, 
    setEnabled: setAutoSendModeEnabled,
    isAutoApproved,
    toggleAutoApprove,
    pauseAllAutoSends,
    setPauseAllAutoSends,
    hasSeenFirstUseModal,
    setHasSeenFirstUseModal
  } = useAutoSendMode();

  const navigate = useNavigate();
  const [selectedSuggestion, setSelectedSuggestion] = useState<FollowUpSuggestion | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'helpful' | 'not_helpful' | 'not_rated'>('all');
  const [markAsDoneTarget, setMarkAsDoneTarget] = useState<FollowUpSuggestion | null>(null);
  const [showResolveAllDialog, setShowResolveAllDialog] = useState(false);
  const [showFirstUseModal, setShowFirstUseModal] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  // Regenerate throttle state
  const [regenerateCooldown, setRegenerateCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Update countdowns every minute
  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {};
      scheduledFollowUps.forEach(item => {
        if (!item.sentAt && !item.cancelledAt) {
          newCountdowns[item.suggestionId] = formatTimeUntil(item.scheduledFor);
        }
      });
      setCountdowns(newCountdowns);
    };
    
    updateCountdowns();
    const interval = setInterval(updateCountdowns, 60000);
    return () => clearInterval(interval);
  }, [scheduledFollowUps]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Listen for filter-unrated-suggestions event from SuggestionRatingStats
  useEffect(() => {
    const handleFilterUnrated = () => {
      setFeedbackFilter('not_rated');
    };
    window.addEventListener('filter-unrated-suggestions', handleFilterUnrated);
    return () => {
      window.removeEventListener('filter-unrated-suggestions', handleFilterUnrated);
    };
  }, []);

  // Feature flag check (must be after hooks to avoid hooks-order errors)
  if (!phase1Enabled) return null;

  // Check if Phase 3 is enabled for Resolve All, Regenerate, Rating, and Filter
  const showResolveAll = isEnabled('aiCrmPhase2');
  const showRegenerate = isEnabled('aiCrmPhase2');
  const showRating = isEnabled('aiCrmPhase2');
  const showFeedbackFilter = isEnabled('aiCrmPhase2');
  const showAutoSend = phase4Enabled && autoSendEnabled;

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

  // Auto-send mode toggle handler
  const handleAutoSendToggle = (checked: boolean) => {
    if (checked && !hasSeenFirstUseModal) {
      setShowFirstUseModal(true);
    } else {
      setAutoSendModeEnabled(checked);
    }
  };

  const confirmFirstUseModal = () => {
    setHasSeenFirstUseModal(true);
    setAutoSendModeEnabled(true);
    setShowFirstUseModal(false);
  };

  // Schedule auto-send for a suggestion
  const handleScheduleAutoSend = async (suggestion: FollowUpSuggestion) => {
    if (pauseAllAutoSends) {
      toast.error('Auto-sends are paused', { description: 'Enable auto-sends first' });
      return;
    }

    // Calculate optimal send time (would use contact window data if available)
    const optimalTime = calculateOptimalSendTime(null, {
      leadQuietMode: false, // Would need to check lead's quiet_mode
    });

    const actionType = suggestion.reason === 'lead_inactive' ? 'call_reminder' : 'email';

    try {
      await scheduleFollowUp.mutateAsync({
        suggestionId: suggestion.id,
        leadId: suggestion.leadId,
        actionType,
        scheduledFor: optimalTime,
        autoApproved: true,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Cancel a scheduled follow-up
  const handleCancelScheduled = (suggestionId: string) => {
    const scheduledItem = getScheduledItem(suggestionId);
    if (scheduledItem) {
      cancelScheduledFollowUp.mutate(scheduledItem.id);
    }
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
              {/* Auto-Send Mode Toggle */}
              {showAutoSend && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 mr-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground hidden sm:inline">Auto-Send</span>
                        <Switch
                          checked={autoSendModeEnabled && !pauseAllAutoSends}
                          onCheckedChange={handleAutoSendToggle}
                          className="data-[state=checked]:bg-primary"
                        />
                        {autoSendModeEnabled && !pauseAllAutoSends && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setPauseAllAutoSends(true)}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        {pauseAllAutoSends && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-warning"
                            onClick={() => setPauseAllAutoSends(false)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI will automatically send approved follow-ups at optimal times</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
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
                
                // Auto-send status
                const scheduledItem = getScheduledItem(suggestion.id);
                const isScheduledForSend = scheduledItem && !scheduledItem.sentAt && !scheduledItem.cancelledAt;
                const wasSent = scheduledItem?.sentAt;
                const wasCancelled = scheduledItem?.cancelledAt;
                const countdown = countdowns[suggestion.id];

                // Determine card state for styling
                const getCardStateClasses = () => {
                  if (wasSent) return "opacity-60 bg-success/10 border-l-2 border-l-success";
                  if (wasCancelled) return "opacity-60 bg-muted/30 border-l-2 border-l-destructive";
                  if (isScheduledForSend) return "bg-warning/5 border-l-2 border-l-warning";
                  if (resolved) return "opacity-60 bg-muted/30";
                  return "hover:bg-muted/50";
                };

                return (
                  <li key={suggestion.id}>
                    <Link
                      to={`/leads?selected=${suggestion.leadId}`}
                      className={cn(
                        "flex items-start gap-3 p-3 -mx-3 rounded-lg transition-colors group",
                        getCardStateClasses()
                      )}
                    >
                      <div className={cn("mt-0.5", resolved || wasSent ? "text-muted-foreground" : config.color)}>
                        {wasSent ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : wasCancelled ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : isScheduledForSend ? (
                          <Timer className="h-5 w-5 text-warning animate-pulse" />
                        ) : resolved ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-medium truncate",
                            (resolved || wasSent || wasCancelled) ? "text-muted-foreground line-through" : "text-foreground"
                          )}>
                            {suggestion.name}
                          </span>
                          {suggestion.company && (
                            <span className="text-sm text-muted-foreground truncate">
                              · {suggestion.company}
                            </span>
                          )}
                          {/* Status badges */}
                          {wasSent && (
                            <Badge variant="outline" className="text-xs font-normal text-success border-success/30">
                              ✅ Auto-sent at {new Date(scheduledItem.sentAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Badge>
                          )}
                          {wasCancelled && (
                            <Badge variant="outline" className="text-xs font-normal text-destructive border-destructive/30">
                              🚫 Cancelled
                            </Badge>
                          )}
                          {isScheduledForSend && countdown && (
                            <Badge variant="outline" className="text-xs font-normal text-warning border-warning/30 flex items-center gap-1">
                              ⏰ Sending in {countdown}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCancelScheduled(suggestion.id);
                                }}
                              >
                                <XCircle className="h-3 w-3 text-destructive" />
                              </Button>
                            </Badge>
                          )}
                          {resolved && !wasSent && !wasCancelled && (
                            <Badge variant="outline" className="text-xs font-normal text-success border-success/30">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant={(resolved || wasSent || wasCancelled) ? "outline" : config.badgeVariant} className="text-xs font-normal">
                            {suggestion.reasonLabel}
                          </Badge>
                          {/* Rating status indicator */}
                          {!resolved && !wasSent && !wasCancelled && hasFeedback(suggestion.id) && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-1">
                              {getFeedback(suggestion.id) === 'helpful' ? (
                                <ThumbsUp className="h-3 w-3 text-success" />
                              ) : (
                                <ThumbsDown className="h-3 w-3 text-destructive" />
                              )}
                              Rated
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "text-sm mt-1",
                          (wasSent || wasCancelled) ? "text-muted-foreground/70" : "text-muted-foreground"
                        )}>
                          {suggestion.suggestionText}
                        </p>
                        
                        {/* Auto-approve checkbox when Auto-Send Mode is ON */}
                        {showAutoSend && autoSendModeEnabled && !resolved && !wasSent && !wasCancelled && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                            <Checkbox
                              id={`auto-approve-${suggestion.id}`}
                              checked={isScheduledForSend || isAutoApproved(suggestion.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  toggleAutoApprove(suggestion.id);
                                  handleScheduleAutoSend(suggestion);
                                } else {
                                  toggleAutoApprove(suggestion.id);
                                  if (isScheduledForSend) {
                                    handleCancelScheduled(suggestion.id);
                                  }
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={pauseAllAutoSends}
                            />
                            <label
                              htmlFor={`auto-approve-${suggestion.id}`}
                              className={cn(
                                "text-xs cursor-pointer",
                                pauseAllAutoSends ? "text-muted-foreground" : "text-foreground"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Auto-approve
                            </label>
                            {pauseAllAutoSends && (
                              <span className="text-xs text-warning">(Paused)</span>
                            )}
                          </div>
                        )}
                        
                        {/* Inline feedback - always visible when not resolved and not sent/cancelled */}
                        {!resolved && !wasSent && !wasCancelled && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                            {hasFeedback(suggestion.id) ? (
                              <span className="text-xs text-success flex items-center gap-1.5">
                                <CheckCheck className="h-3.5 w-3.5" />
                                Thanks for your feedback
                              </span>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">Rate this suggestion:</span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-xs gap-1 border-muted-foreground/30"
                                        onClick={(e) => handleFeedback(e, suggestion, 'helpful')}
                                      >
                                        <ThumbsUp className="h-3 w-3" />
                                        Helpful
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-xs gap-1 border-muted-foreground/30"
                                        onClick={(e) => handleFeedback(e, suggestion, 'not_helpful')}
                                      >
                                        <ThumbsDown className="h-3 w-3" />
                                        Not helpful
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>Tell us if this suggestion was useful</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(wasSent || wasCancelled) ? (
                          // No actions for sent/cancelled items
                          <span className="text-xs text-muted-foreground">
                            {wasSent && "Completed"}
                            {wasCancelled && "Dismissed"}
                          </span>
                        ) : resolved ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                            onClick={(e) => handleUndo(e, suggestion.id)}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Undo
                          </Button>
                        ) : isScheduledForSend ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancelScheduled(suggestion.id);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
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

      {/* Auto-Send First Use Modal */}
      <Dialog open={showFirstUseModal} onOpenChange={setShowFirstUseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Enable Auto-Send Mode
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>When Auto-Send is enabled:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>AI will send approved follow-ups at optimal contact times</li>
                <li>Maximum 3 auto-sends per lead per week</li>
                <li>24-hour gap between sends to the same lead</li>
                <li>Respects lead quiet mode and business hours</li>
                <li>You can cancel any scheduled send at any time</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFirstUseModal(false)}>
              Cancel
            </Button>
            <Button onClick={confirmFirstUseModal}>
              <Bot className="h-4 w-4 mr-2" />
              Enable Auto-Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}