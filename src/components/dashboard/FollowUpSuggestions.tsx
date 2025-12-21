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
import { AlertCircle, Clock, Eye, UserX, ChevronRight, RefreshCw, MessageSquare, Phone, Check, Loader2 } from 'lucide-react';
import { useFollowUpSuggestions, SuggestionReason, FollowUpSuggestion } from '@/hooks/useFollowUpSuggestions';
import { useFollowupLearning } from '@/hooks/useFollowupLearning';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { data: suggestions, isLoading, error, refetch } = useFollowUpSuggestions();
  const { logAccepted, confirmAction } = useFollowupLearning();
  const navigate = useNavigate();
  const [selectedSuggestion, setSelectedSuggestion] = useState<FollowUpSuggestion | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

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
    </>
  );
}