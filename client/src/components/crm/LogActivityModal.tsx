import { useState } from 'react';
import { useAddActivity } from '@/hooks/useCRMData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Phone, Mail, Calendar, MessageSquare } from 'lucide-react';

interface LogActivityModalProps {
  open: boolean;
  onClose: () => void;
  type: 'call' | 'email' | 'meeting' | 'note';
  relatedTo: {
    type: 'contact' | 'account' | 'lead' | 'deal';
    id: string;
    name: string;
  };
}

const typeConfig = {
  call: { icon: Phone, label: 'Log Call', subjectPlaceholder: 'Call with...' },
  email: { icon: Mail, label: 'Log Email', subjectPlaceholder: 'Email subject...' },
  meeting: { icon: Calendar, label: 'Log Meeting', subjectPlaceholder: 'Meeting about...' },
  note: { icon: MessageSquare, label: 'Add Note', subjectPlaceholder: 'Note title...' },
};

export function LogActivityModal({ open, onClose, type, relatedTo }: LogActivityModalProps) {
  const addActivity = useAddActivity();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    await addActivity.mutateAsync({
      type,
      subject,
      description: description || undefined,
      relatedTo,
    });

    toast.success(`${config.label.replace('Log ', '').replace('Add ', '')} logged successfully`);
    setSubject('');
    setDescription('');
    onClose();
  };

  const handleClose = () => {
    setSubject('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.label}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="related">Related To</Label>
            <Input id="related" value={relatedTo.name} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder={config.subjectPlaceholder}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
