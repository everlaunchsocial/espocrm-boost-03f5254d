import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ArrowUp, Equal, Minus, Plus } from 'lucide-react';
import type {
  BacklogStatus,
  BacklogTag,
  BacklogPriority,
  CreateBacklogItemPayload,
} from '@/types/backlog';

const PRIORITY_OPTIONS: { value: BacklogPriority; label: string; icon: typeof AlertTriangle }[] = [
  { value: 'critical', label: 'Critical', icon: AlertTriangle },
  { value: 'high', label: 'High', icon: ArrowUp },
  { value: 'medium', label: 'Medium', icon: Equal },
  { value: 'low', label: 'Low', icon: Minus },
];

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: BacklogStatus[];
  tags: BacklogTag[];
  onSubmit: (payload: CreateBacklogItemPayload) => Promise<unknown>;
  defaultStatusId?: string;
}

export function CreateItemModal({
  isOpen,
  onClose,
  statuses,
  tags,
  onSubmit,
  defaultStatusId,
}: CreateItemModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateBacklogItemPayload>({
    title: '',
    description: '',
    status_id: defaultStatusId || statuses.find((s) => s.is_default)?.id,
    priority: 'medium',
    tag_ids: [],
    conversation_context: '',
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        title: '',
        description: '',
        status_id: defaultStatusId || statuses.find((s) => s.is_default)?.id,
        priority: 'medium',
        tag_ids: [],
        conversation_context: '',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids?.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...(prev.tag_ids || []), tagId],
    }));
  };

  const selectedStatus = statuses.find((s) => s.id === formData.status_id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Feature
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              autoFocus
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Add social media scheduling for affiliates"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status_id}
                onValueChange={(v) => setFormData({ ...formData, status_id: v })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedStatus && (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: selectedStatus.color }}
                        />
                        {selectedStatus.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as BacklogPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-3 w-3" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this feature do? Why is it important?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Conversation Context</Label>
            <Textarea
              value={formData.conversation_context || ''}
              onChange={(e) => setFormData({ ...formData, conversation_context: e.target.value })}
              placeholder="Key discussion points from AI chat..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={formData.tag_ids?.includes(tag.id) ? 'default' : 'outline'}
                  className="cursor-pointer transition-all"
                  style={
                    formData.tag_ids?.includes(tag.id)
                      ? { backgroundColor: tag.color, borderColor: tag.color }
                      : { borderColor: tag.color, color: tag.color }
                  }
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.title.trim() || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Feature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
