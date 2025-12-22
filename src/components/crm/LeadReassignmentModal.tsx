import { useState } from 'react';
import { useCRMTeamMembers } from '@/hooks/useCRMTeamMembers';
import { useUpdateLead, useAddNote } from '@/hooks/useCRMData';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LeadReassignmentModalProps {
  leadId: string;
  leadName: string;
  currentAssignedUserId?: string | null;
  open: boolean;
  onClose: () => void;
}

export function LeadReassignmentModal({
  leadId,
  leadName,
  currentAssignedUserId,
  open,
  onClose,
}: LeadReassignmentModalProps) {
  const { data: teamMembers, isLoading: loadingMembers } = useCRMTeamMembers();
  const updateLead = useUpdateLead();
  const addNote = useAddNote();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const currentAssignee = teamMembers?.find(m => m.user_id === currentAssignedUserId);
  const selectedMember = teamMembers?.find(m => m.user_id === selectedUserId);

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error('Please select a team member');
      return;
    }

    if (selectedUserId === currentAssignedUserId) {
      toast.error('Lead is already assigned to this user');
      return;
    }

    try {
      // Update the lead assignment
      await updateLead.mutateAsync({
        id: leadId,
        lead: { assignedToUserId: selectedUserId },
      });

      // Create a timeline note
      const fromLabel = currentAssignee?.email || 'Unassigned';
      const toLabel = selectedMember?.email || selectedUserId;
      const noteContent = reason
        ? `👤 Lead reassigned from ${fromLabel} to ${toLabel} — ${reason}`
        : `👤 Lead reassigned from ${fromLabel} to ${toLabel}`;

      await addNote.mutateAsync({
        content: noteContent,
        relatedTo: {
          type: 'lead',
          id: leadId,
          name: leadName,
        },
      });

      toast.success(`Lead reassigned to ${toLabel}`);
      onClose();

      // Reset form
      setSelectedUserId('');
      setReason('');
    } catch (error) {
      toast.error('Failed to reassign lead');
      console.error('Error reassigning lead:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Lead</DialogTitle>
          <DialogDescription>
            Reassign {leadName} to another team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Assignment */}
          {currentAssignedUserId && currentAssignee && (
            <div className="text-sm text-muted-foreground">
              Currently assigned to: <span className="font-medium text-foreground">{currentAssignee.email}</span>
            </div>
          )}

          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assign to</Label>
            {loadingMembers ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading team members...
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers?.map((member) => (
                    <SelectItem 
                      key={member.user_id} 
                      value={member.user_id}
                      disabled={member.user_id === currentAssignedUserId}
                    >
                      <div className="flex items-center gap-2">
                        <span>{member.email}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({member.global_role.replace('_', ' ')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this lead being reassigned?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || updateLead.isPending || addNote.isPending}
          >
            {(updateLead.isPending || addNote.isPending) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reassigning...
              </>
            ) : (
              'Reassign Lead'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
