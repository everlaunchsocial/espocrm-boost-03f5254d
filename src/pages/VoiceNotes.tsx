import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Plus, Trash2, Copy, FileText } from 'lucide-react';
import { useCallAssistant, formatDuration } from '@/hooks/useCallAssistant';
import { useLocalNotes } from '@/hooks/useLocalNotes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const VoiceNotes = () => {
  const {
    notes,
    activeNote,
    activeNoteId,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
  } = useLocalNotes();

  const {
    isListening,
    transcript,
    interimTranscript,
    duration,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useCallAssistant();

  const [pendingTranscript, setPendingTranscript] = useState('');

  // When we get a final transcript, append it to the note
  useEffect(() => {
    if (transcript && transcript !== pendingTranscript) {
      setPendingTranscript(transcript);
      if (activeNote) {
        const separator = activeNote.content ? '\n\n' : '';
        updateNote(activeNote.id, activeNote.content + separator + transcript);
      }
    }
  }, [transcript, pendingTranscript, activeNote, updateNote]);

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setPendingTranscript('');
      // Create a new note if none exists
      if (!activeNote) {
        createNote();
      }
      startListening();
    }
  };

  const handleCopyPlain = () => {
    if (activeNote?.content) {
      navigator.clipboard.writeText(activeNote.content);
      toast.success('Copied to clipboard');
    }
  };

  const handleCopyMarkdown = () => {
    if (activeNote?.content) {
      const md = `# ${activeNote.title}\n\n${activeNote.content}\n\n---\n*Recorded: ${format(new Date(activeNote.createdAt), 'PPpp')}*`;
      navigator.clipboard.writeText(md);
      toast.success('Copied as Markdown');
    }
  };

  const handleDelete = () => {
    if (activeNote) {
      deleteNote(activeNote.id);
      toast.success('Note deleted');
    }
  };

  const handleNewNote = () => {
    if (isListening) {
      stopListening();
    }
    resetTranscript();
    setPendingTranscript('');
    createNote();
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <MicOff className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Voice Recognition Not Supported</h1>
          <p className="text-muted-foreground">
            Your browser doesn't support the Web Speech API. Please try Chrome, Edge, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Voice Notes</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewNote}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Notes List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border p-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Saved Notes</h2>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No notes yet</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-2">
                    {notes.map(note => (
                      <button
                        key={note.id}
                        onClick={() => selectNote(note.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg transition-colors',
                          'hover:bg-accent/50',
                          note.id === activeNoteId
                            ? 'bg-accent border border-primary/20'
                            : 'bg-muted/30'
                        )}
                      >
                        <p className="font-medium text-sm truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(note.updatedAt), 'MMM d, h:mm a')}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Recording Button */}
            <div className="bg-card rounded-lg border p-8 text-center">
              <button
                onClick={handleToggleRecording}
                className={cn(
                  'w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all',
                  'focus:outline-none focus:ring-4 focus:ring-primary/20',
                  isListening
                    ? 'bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {isListening ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </button>

              <p className="mt-4 text-lg font-medium">
                {isListening ? 'Recording...' : 'Click to Record'}
              </p>

              <p className="text-2xl font-mono text-muted-foreground mt-2">
                {formatDuration(duration)}
              </p>

              {/* Live transcript preview */}
              {isListening && interimTranscript && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground italic">
                    {interimTranscript}
                  </p>
                </div>
              )}
            </div>

            {/* Transcript Editor */}
            <div className="bg-card rounded-lg border">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-medium">
                  {activeNote?.title || 'No note selected'}
                </h2>
                {activeNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="p-4 relative">
                <Textarea
                  value={activeNote?.content || ''}
                  onChange={(e) => activeNote && updateNote(activeNote.id, e.target.value)}
                  placeholder={activeNote ? 'Your transcription will appear here...' : 'Create or select a note to get started'}
                  className="min-h-[300px] resize-none font-mono text-sm pb-14"
                  disabled={!activeNote}
                />
                {/* Floating copy buttons */}
                {activeNote?.content && (
                  <div className="absolute bottom-6 right-6 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyPlain}
                      className="shadow-md"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyMarkdown}
                      className="shadow-md"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      MD
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceNotes;
