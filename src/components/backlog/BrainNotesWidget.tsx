import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BrainNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function BrainNotesWidget() {
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center",
          "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
          "bg-purple-600 hover:bg-purple-700 text-white",
          "hover:scale-105 active:scale-95",
          isOpen && "rotate-180"
        )}
      >
        <Brain className="h-6 w-6" />
        {notes.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
            {notes.length}
          </span>
        )}
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-h-[60vh] rounded-lg border bg-background shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-purple-950/30">
            <div className="flex items-center gap-2 text-purple-300 font-medium">
              <Brain className="h-5 w-5" />
              Brain Dump
              <span className="text-xs text-muted-foreground font-normal">
                ({notes.length})
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Add new note */}
          <div className="p-3 border-b bg-muted/30">
            <div className="flex gap-2">
              <Textarea
                placeholder="Dump stuff here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[50px] text-sm bg-background resize-none"
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
                className="shrink-0 h-auto"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">⌘+Enter to save</p>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No notes yet. Start dumping!</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="group relative p-2.5 rounded-md bg-muted/50 border border-border/50 hover:border-purple-500/30 transition-colors"
                >
                  <p className="text-sm whitespace-pre-wrap pr-6 leading-relaxed">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {format(new Date(note.created_at), 'MMM d, h:mm a')}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => deleteNote.mutate(note.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
