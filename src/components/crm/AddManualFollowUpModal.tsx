import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useManualFollowUps } from '@/hooks/useManualFollowUps';

interface AddManualFollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}

const FOLLOW_UP_TYPES = [
  { value: 'call_reminder', label: 'Call Reminder' },
  { value: 'send_text', label: 'Send Text' },
  { value: 'email_follow_up', label: 'Email Follow-Up' },
  { value: 're_send_demo', label: 'Re-send Demo' },
  { value: 'custom', label: 'Custom' },
];

export function AddManualFollowUpModal({
  open,
  onOpenChange,
  leadId,
}: AddManualFollowUpModalProps) {
  const [type, setType] = useState('');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const { createFollowUp } = useManualFollowUps(leadId);

  const handleSave = () => {
    if (!type || !summary.trim()) return;

    createFollowUp.mutate(
      {
        lead_id: leadId,
        type,
        summary: summary.trim(),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          // Reset form and close modal
          setType('');
          setSummary('');
          setNotes('');
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    setType('');
    setSummary('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Manual Follow-Up</DialogTitle>
          <DialogDescription>
            Create a manual follow-up reminder for this lead. No messages will be sent.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select follow-up type" />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="summary">Summary *</Label>
            <Input
              id="summary"
              placeholder="Brief description of the follow-up"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details or context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!type || !summary.trim() || createFollowUp.isPending}
          >
            {createFollowUp.isPending ? 'Saving...' : 'Save Follow-Up'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
