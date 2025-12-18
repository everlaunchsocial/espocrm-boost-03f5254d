import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowUp,
  Equal,
  Minus,
  MessageSquare,
  History,
  Paperclip,
  Link2,
  Save,
  X,
  Send,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBacklogItem } from '@/hooks/useBacklog';
import type {
  BacklogItemWithRelations,
  BacklogStatus,
  BacklogTag,
  BacklogPriority,
  UpdateBacklogItemPayload,
  ACTION_LABELS,
} from '@/types/backlog';

const PRIORITY_OPTIONS: { value: BacklogPriority; label: string; icon: typeof AlertTriangle }[] = [
  { value: 'critical', label: 'Critical', icon: AlertTriangle },
  { value: 'high', label: 'High', icon: ArrowUp },
  { value: 'medium', label: 'Medium', icon: Equal },
  { value: 'low', label: 'Low', icon: Minus },
];

interface BacklogItemModalProps {
  item: BacklogItemWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  statuses: BacklogStatus[];
  tags: BacklogTag[];
  onUpdate: (id: string, payload: UpdateBacklogItemPayload) => Promise<unknown>;
  onUpdateTags: (itemId: string, tagIds: string[]) => Promise<unknown>;
  onAddComment: (payload: { item_id: string; body: string }) => Promise<unknown>;
}

export function BacklogItemModal({
  item,
  isOpen,
  onClose,
  statuses,
  tags,
  onUpdate,
  onUpdateTags,
  onAddComment,
}: BacklogItemModalProps) {
  const [editedItem, setEditedItem] = useState<Partial<UpdateBacklogItemPayload>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { comments, history, chatLinks, isLoading, refresh } = useBacklogItem(item?.id ?? null);

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setEditedItem({
        title: item.title,
        description: item.description || '',
        status_id: item.status_id,
        priority: item.priority,
        story_points: item.story_points || undefined,
        estimated_hours: item.estimated_hours || undefined,
        conversation_context: item.conversation_context || '',
      });
      setSelectedTags(item.tags?.map((t) => t.id) || []);
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    setIsSaving(true);
    try {
      await onUpdate(item.id, editedItem);
      if (JSON.stringify(selectedTags) !== JSON.stringify(item.tags?.map((t) => t.id) || [])) {
        await onUpdateTags(item.id, selectedTags);
      }
      refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!item || !newComment.trim()) return;
    await onAddComment({ item_id: item.id, body: newComment.trim() });
    setNewComment('');
    refresh();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  if (!item) return null;

  const currentStatus = statuses.find((s) => s.id === editedItem.status_id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentStatus?.color }}
            />
            Edit Feature
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" className="gap-1">
              Details
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1">
              <MessageSquare className="h-3 w-3" />
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="h-3 w-3" />
              History ({history.length})
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1">
              <Link2 className="h-3 w-3" />
              Links ({chatLinks.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 m-0">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editedItem.title || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
                  placeholder="Feature title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editedItem.status_id}
                    onValueChange={(v) => setEditedItem({ ...editedItem, status_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                    value={editedItem.priority}
                    onValueChange={(v) =>
                      setEditedItem({ ...editedItem, priority: v as BacklogPriority })
                    }
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Story Points</Label>
                  <Input
                    type="number"
                    value={editedItem.story_points || ''}
                    onChange={(e) =>
                      setEditedItem({
                        ...editedItem,
                        story_points: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="Points"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editedItem.estimated_hours || ''}
                    onChange={(e) =>
                      setEditedItem({
                        ...editedItem,
                        estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="Hours"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editedItem.description || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                  placeholder="Detailed description..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Conversation Context</Label>
                <Textarea
                  value={editedItem.conversation_context || ''}
                  onChange={(e) =>
                    setEditedItem({ ...editedItem, conversation_context: e.target.value })
                  }
                  placeholder="Key discussion points from AI chat that led to this idea..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      style={
                        selectedTags.includes(tag.id)
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

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4 m-0">
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-muted-foreground">
                        {comment.created_by || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No comments yet</p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="m-0">
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-2 border-l-2 border-muted hover:border-primary/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{entry.action}</span>
                        {entry.actor_email && (
                          <span className="text-xs text-muted-foreground">
                            by {entry.actor_email}
                          </span>
                        )}
                      </div>
                      {Object.keys(entry.changed_fields).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Changed: {Object.keys(entry.changed_fields).join(', ')}
                        </div>
                      )}
                      {entry.reason && (
                        <div className="text-xs text-muted-foreground italic mt-1">
                          "{entry.reason}"
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No history yet</p>
                )}
              </div>
            </TabsContent>

            {/* Chat Links Tab */}
            <TabsContent value="links" className="m-0">
              <div className="space-y-3">
                {chatLinks.map((link) => (
                  <div key={link.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">{link.chat_platform}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {link.summary && <p className="text-sm mb-2">{link.summary}</p>}
                    {link.chat_snapshot && link.chat_snapshot.length > 0 && (
                      <div className="space-y-1 border-t pt-2 mt-2">
                        {(link.chat_snapshot as any[]).slice(0, 3).map((msg, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-medium">{msg.role}:</span>{' '}
                            <span className="text-muted-foreground line-clamp-1">
                              {msg.content}
                            </span>
                          </div>
                        ))}
                        {(link.chat_snapshot as any[]).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{(link.chat_snapshot as any[]).length - 3} more messages
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {chatLinks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No linked chats</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
