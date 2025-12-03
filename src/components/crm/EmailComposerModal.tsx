import { useState, useEffect } from 'react';
import { EmailRecipient } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AIEmailAssistant } from './AIEmailAssistant';
import { useCRMStore } from '@/stores/crmStore';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SenderAddress {
  id: string;
  email: string;
  name: string;
  is_default: boolean;
}

interface EmailComposerModalProps {
  recipient: EmailRecipient | null;
  open: boolean;
  onClose: () => void;
}

export function EmailComposerModal({ recipient, open, onClose }: EmailComposerModalProps) {
  const { addActivity } = useCRMStore();
  const [senderAddresses, setSenderAddresses] = useState<SenderAddress[]>([]);
  const [selectedSender, setSelectedSender] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Fetch sender addresses on mount
  useEffect(() => {
    async function fetchSenderAddresses() {
      setLoadingAddresses(true);
      const { data, error } = await supabase
        .from('sender_addresses')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching sender addresses:', error);
        toast.error('Failed to load sender addresses');
      } else if (data && data.length > 0) {
        setSenderAddresses(data);
        const defaultSender = data.find((s) => s.is_default) || data[0];
        setSelectedSender(defaultSender.id);
      }
      setLoadingAddresses(false);
    }

    if (open) {
      fetchSenderAddresses();
    }
  }, [open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSubject('');
      setBody('');
      setShowAIAssistant(false);
    }
  }, [open, recipient]);

  const handleSend = async () => {
    if (!recipient || !selectedSender || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const sender = senderAddresses.find((s) => s.id === selectedSender);
    if (!sender) {
      toast.error('Please select a sender');
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          contactId: recipient.id,
          senderAddress: sender.email,
          senderName: sender.name,
          toEmail: recipient.email,
          toName: `${recipient.firstName} ${recipient.lastName}`,
          subject,
          body: body.replace(/\n/g, '<br>'),
        },
      });

      if (error) throw error;

      // Log activity with correct entity type
      addActivity({
        type: 'email',
        subject: `Email sent: ${subject}`,
        description: `Sent to ${recipient.email}`,
        relatedTo: {
          type: recipient.entityType,
          id: recipient.id,
          name: `${recipient.firstName} ${recipient.lastName}`,
        },
      });

      toast.success('Email sent successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleAIGenerated = (generatedBody: string) => {
    // Clean up HTML if present and convert to plain text with newlines
    const cleanBody = generatedBody
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .trim();
    setBody(cleanBody);
    setShowAIAssistant(false);
  };

  if (!recipient) return null;

  const sender = senderAddresses.find((s) => s.id === selectedSender);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Sender selection */}
          <div className="space-y-2">
            <Label>From</Label>
            {loadingAddresses ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : senderAddresses.length === 0 ? (
              <p className="text-sm text-destructive">
                No sender addresses configured. Please add one first.
              </p>
            ) : (
              <Select value={selectedSender} onValueChange={setSelectedSender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sender" />
                </SelectTrigger>
                <SelectContent>
                  {senderAddresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.id}>
                      {addr.name} &lt;{addr.email}&gt;
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              value={`${recipient.firstName} ${recipient.lastName} <${recipient.email}>`}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>

          {/* AI Assistant toggle */}
          {showAIAssistant ? (
            <AIEmailAssistant
              recipient={recipient}
              senderName={sender?.name || 'Your Name'}
              onGenerated={handleAIGenerated}
              onCancel={() => setShowAIAssistant(false)}
            />
          ) : (
            <>
              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIAssistant(true)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Write with AI
                  </Button>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={10}
                  className="resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !body.trim() || !selectedSender}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
