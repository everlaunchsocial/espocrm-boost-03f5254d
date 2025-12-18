import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BrainNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function BrainNotes() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newNote, setNewNote] = useState('');
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
      toast.success('Note saved to Brain');
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

  return (
    <Card className="border-purple-500/30 bg-purple-950/20">
      <CardHeader 
        className="cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-purple-300">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Brain className="h-5 w-5" />
          Brain
          <span className="text-xs text-muted-foreground font-normal ml-2">
            ({notes.length} notes)
          </span>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {/* Add new note */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Dump stuff here to find later..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[60px] text-sm bg-background/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddNote();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNote.isPending}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Notes list */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet. Start dumping!</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group relative p-3 rounded-md bg-background/30 border border-border/50 hover:border-purple-500/30 transition-colors"
                >
                  <p className="text-sm whitespace-pre-wrap pr-8">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => deleteNote.mutate(note.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
