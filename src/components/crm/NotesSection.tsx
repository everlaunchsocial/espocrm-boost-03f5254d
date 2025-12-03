import { useState } from 'react';
import { Note } from '@/types/crm';
import { useCRMStore } from '@/stores/crmStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StickyNote, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface NotesSectionProps {
  relatedTo: {
    type: 'contact' | 'account' | 'lead' | 'deal';
    id: string;
    name: string;
  };
}

export function NotesSection({ relatedTo }: NotesSectionProps) {
  const { notes, addNote, deleteNote } = useCRMStore();
  const [newNoteContent, setNewNoteContent] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent-first' | 'oldest-first'>('recent-first');

  // Filter notes for this entity
  const entityNotes = notes.filter(
    (note) => note.relatedTo.type === relatedTo.type && note.relatedTo.id === relatedTo.id
  );

  // Sort notes
  const sortedNotes = [...entityNotes].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'recent-first' ? dateB - dateA : dateA - dateB;
  });

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    
    addNote({
      content: newNoteContent.trim(),
      relatedTo,
      createdBy: 'Current User', // In a real app, this would come from auth
    });
    setNewNoteContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddNote();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with sort */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent-first">Recent Last</SelectItem>
            <SelectItem value="oldest-first">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes list */}
      {sortedNotes.length > 0 ? (
        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className="group p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="text-primary">{relatedTo.type} - {relatedTo.name}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                    {note.createdBy && (
                      <>
                        <span>•</span>
                        <span>by {note.createdBy}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteNote(note.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No notes yet. Add your first note below.
        </p>
      )}

      {/* Add note input */}
      <div className="border border-border rounded-lg p-3 bg-muted/30">
        <Textarea
          placeholder="Add a note..."
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            Press Cmd/Ctrl + Enter to save
          </span>
          <Button
            size="sm"
            onClick={handleAddNote}
            disabled={!newNoteContent.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}
