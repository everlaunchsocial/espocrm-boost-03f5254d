import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, MessageSquare, Send, FileText, Activity, AlertTriangle, Eye, User } from 'lucide-react';
import { Lead } from '@/types/crm';
import { PreCallNote, PreCallActivity, PreCallDemoStatus, PreCallFollowUp } from '@/hooks/usePreCallSummary';
import { LeadTag } from '@/hooks/useLeadTags';
import { formatDistanceToNow } from 'date-fns';

interface SendSummaryModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  notes: PreCallNote[];
  activities: PreCallActivity[];
  demoStatus: PreCallDemoStatus | null;
  followUps: PreCallFollowUp[];
  tags: LeadTag[];
}

export function SendSummaryModal({
  open,
  onClose,
  lead,
  notes,
  activities,
  demoStatus,
  followUps,
  tags,
}: SendSummaryModalProps) {
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [isSending, setIsSending] = useState(false);

  const formatTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleSend = async () => {
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await supabase.functions.invoke('send-precall-summary', {
        body: {
          channel,
          leadName: `${lead.firstName} ${lead.lastName}`,
          leadCompany: lead.company,
          leadStatus: lead.status,
          tags: tags.map(t => t.tag_text),
          notes: notes.map(n => ({ content: n.content, createdAt: n.createdAt })),
          activities: activities.map(a => ({ type: a.type, summary: a.summary, eventAt: a.eventAt })),
          demoStatus: demoStatus ? {
            sent: demoStatus.sent,
            viewed: demoStatus.viewed,
            progressPercent: demoStatus.progressPercent,
          } : null,
          followUps: followUps.map(f => ({ reason: f.reason, suggestionText: f.suggestionText })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send summary');
      }

      toast.success(`Summary sent to your ${channel === 'email' ? 'email' : 'phone'}`);
      onClose();
    } catch (error: any) {
      console.error('Error sending summary:', error);
      toast.error(error.message || 'Failed to send summary');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Pre-Call Summary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Channel Selector */}
          <div className="space-y-2">
            <Label>Send via</Label>
            <Select value={channel} onValueChange={(v: 'email' | 'sms') => setChannel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="sms" disabled>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS (coming soon)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <ScrollArea className="h-[280px] border rounded-lg p-3 bg-muted/20">
              <div className="space-y-3 text-sm">
                {/* Lead Overview */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <User className="h-3 w-3" />
                    Lead Overview
                  </div>
                  <div className="pl-4">
                    <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                    {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                    <Badge variant="outline" className="text-xs mt-1">{lead.status}</Badge>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.slice(0, 3).map(t => (
                          <Badge key={t.id} variant="secondary" className="text-xs px-1 py-0">
                            {t.tag_text}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {notes.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      Recent Notes
                    </div>
                    <div className="pl-4 space-y-1">
                      {notes.map(n => (
                        <p key={n.id} className="text-xs text-muted-foreground line-clamp-2">
                          {n.content}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities */}
                {activities.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      Recent Activity
                    </div>
                    <div className="pl-4 space-y-1">
                      {activities.map(a => (
                        <p key={a.id} className="text-xs text-muted-foreground">
                          {a.summary}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-ups */}
                {followUps.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      Follow-Up Flags
                    </div>
                    <div className="pl-4 space-y-1">
                      {followUps.map(f => (
                        <p key={f.id} className="text-xs text-amber-600">
                          {f.reason}: {f.suggestionText}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Demo Status */}
                {demoStatus && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      Demo Status
                    </div>
                    <div className="pl-4 text-xs text-muted-foreground">
                      Sent: {demoStatus.sent ? '✓' : '✗'} | 
                      Viewed: {demoStatus.viewed ? '✓' : '✗'}
                      {demoStatus.progressPercent !== undefined && ` | ${demoStatus.progressPercent}%`}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
