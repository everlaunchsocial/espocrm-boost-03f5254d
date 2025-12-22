import { useState } from 'react';
import { useSequences, useAddLeadToSequence } from '@/hooks/useSequences';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Shuffle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMinutes } from 'date-fns';

interface AddToSequenceModalProps {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
}

export function AddToSequenceModal({ leadId, leadName, open, onClose }: AddToSequenceModalProps) {
  const { data: sequences, isLoading: loadingSequences } = useSequences();
  const addToSequence = useAddLeadToSequence();
  
  const defaultDateTime = format(addMinutes(new Date(), 5), "yyyy-MM-dd'T'HH:mm");
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [startDateTime, setStartDateTime] = useState<string>(defaultDateTime);

  const selectedSequence = sequences?.find(s => s.id === selectedSequenceId);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'sms':
        return <MessageSquare className="h-3 w-3" />;
      case 'mixed':
        return <Shuffle className="h-3 w-3" />;
      default:
        return <Mail className="h-3 w-3" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'email':
        return 'Email';
      case 'sms':
        return 'SMS';
      case 'mixed':
        return 'Email + SMS';
      default:
        return channel;
    }
  };

  const handleSubmit = async () => {
    if (!selectedSequenceId) {
      toast.error('Please select a sequence');
      return;
    }

    try {
      await addToSequence.mutateAsync({
        leadId,
        sequenceId: selectedSequenceId,
        scheduledStartAt: new Date(startDateTime),
      });

      toast.success('Lead added to sequence');
      onClose();
      
      // Reset form
      setSelectedSequenceId('');
      setStartDateTime(defaultDateTime);
    } catch (error) {
      toast.error('Failed to add lead to sequence');
      console.error('Error adding to sequence:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Sequence</DialogTitle>
          <DialogDescription>
            Add {leadName} to a messaging sequence
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sequence Selection */}
          <div className="space-y-2">
            <Label htmlFor="sequence">Select Sequence</Label>
            {loadingSequences ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sequences...
              </div>
            ) : (
              <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                <SelectTrigger id="sequence">
                  <SelectValue placeholder="Choose a sequence..." />
                </SelectTrigger>
                <SelectContent>
                  {sequences?.map((sequence) => (
                    <SelectItem key={sequence.id} value={sequence.id}>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(sequence.channel)}
                        <span>{sequence.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({sequence.steps_count} steps)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedSequence?.description && (
              <p className="text-xs text-muted-foreground">{selectedSequence.description}</p>
            )}
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Sequence will begin at this time (default: 5 minutes from now)
            </p>
          </div>

          {/* Channel Preview */}
          {selectedSequence && (
            <div className="space-y-2">
              <Label>Channel</Label>
              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                {getChannelIcon(selectedSequence.channel)}
                {getChannelLabel(selectedSequence.channel)}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedSequenceId || addToSequence.isPending}
          >
            {addToSequence.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add to Sequence ✅'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
