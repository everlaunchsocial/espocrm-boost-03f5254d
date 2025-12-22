import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useLeadTeamNotes } from '@/hooks/useLeadTeamNotes';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';

interface LeadTeamNotesProps {
  leadId: string;
}

export function LeadTeamNotes({ leadId }: LeadTeamNotesProps) {
  const { isEnabled } = useFeatureFlags();
  const { notes, isLoading, addNote } = useLeadTeamNotes(leadId);
  const [newNote, setNewNote] = useState('');

  if (!isEnabled('aiCrmPhase2')) return null;

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote.mutateAsync(newNote);
      setNewNote('');
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const getInitials = (userId: string) => {
    // For now, show first 2 chars of user ID as placeholder
    return userId.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">Team Notes</h4>
        <span className="text-xs text-muted-foreground">({notes.length})</span>
      </div>

      {/* New note input */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a note for your team..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[80px] resize-none text-sm"
        />
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={addNote.isPending || !newNote.trim()}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Save Note
        </Button>
      </div>

      {/* Notes list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team notes yet</p>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-3 bg-muted/30">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-secondary-foreground">
                    {getInitials(note.created_by)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
