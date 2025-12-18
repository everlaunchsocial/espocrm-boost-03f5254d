import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BrainNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function BrainNotesTab() {
  const [newNote, setNewNote] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['brain-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brain_notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BrainNote[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('brain_notes')
        .insert({ content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-notes'] });
      setNewNote('');
      toast.success('Note saved');
    },
    onError: () => toast.error('Failed to save note'),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brain_notes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-notes'] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote.mutate(newNote.trim());
    }
  };

  const filteredNotes = notes.filter(note =>
    note.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Add new note */}
      <Card className="bg-purple-950/20 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Textarea
              placeholder="Dump your thoughts here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px] bg-background resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddNote();
                }
              }}
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNote.isPending}
              className="shrink-0 h-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">⌘+Enter to save quickly</p>
        </CardContent>
      </Card>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'No notes match your search' : 'No notes yet. Start brain dumping!'}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="group hover:border-purple-500/50 transition-colors">
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed mb-3">
                  {note.content}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => deleteNote.mutate(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
