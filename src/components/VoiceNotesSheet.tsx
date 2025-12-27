import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Mic, MicOff, Plus, Trash2, Copy, FileText, ExternalLink } from 'lucide-react';
import { useCallAssistant, formatDuration } from '@/hooks/useCallAssistant';
import { useLocalNotes } from '@/hooks/useLocalNotes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const VoiceNotesSheet = () => {
  const [isOpen, setIsOpen] = useState(false);

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

  const lastAppendedLengthRef = useRef(0);
  const activeNoteIdRef = useRef<string | null>(null);

  // Reset tracking when active note changes
  useEffect(() => {
    if (activeNoteId !== activeNoteIdRef.current) {
      activeNoteIdRef.current = activeNoteId;
      lastAppendedLengthRef.current = 0;
    }
  }, [activeNoteId]);

  // When we get a final transcript, append ONLY the delta (new portion)
  useEffect(() => {
    if (transcript && activeNote) {
      const currentLen = transcript.length;
      const lastLen = lastAppendedLengthRef.current;

      if (currentLen > lastLen) {
        const delta = transcript.slice(lastLen);
        const separator = activeNote.content && lastLen === 0 ? '\n\n' : '';
        updateNote(activeNote.id, activeNote.content + separator + delta);
        lastAppendedLengthRef.current = currentLen;
      }
    }
  }, [transcript, activeNote, updateNote]);

  // Handle tab visibility - stop recording when tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isListening) {
        stopListening();
        toast.info('Recording paused - tab was hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isListening, stopListening]);

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      lastAppendedLengthRef.current = 0;
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
    lastAppendedLengthRef.current = 0;
    createNote();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/voice-notes"
              onClick={handleClick}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
                "ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "hover:bg-accent hover:text-accent-foreground h-10 w-10"
              )}
            >
              <Mic className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voice Notes (right-click to open in new tab)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[450px] sm:w-[500px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <SheetTitle>Voice Notes</SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleNewNote}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/voice-notes"
                      target="_blank"
                      className={cn(
                        "inline-flex items-center justify-center rounded-md text-sm font-medium",
                        "hover:bg-accent hover:text-accent-foreground h-8 w-8"
                      )}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open in new tab</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </SheetHeader>

          {!isSupported ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center max-w-xs">
                <MicOff className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h2 className="text-lg font-semibold mb-1">Not Supported</h2>
                <p className="text-sm text-muted-foreground">
                  Your browser doesn't support the Web Speech API. Please try Chrome, Edge, or Safari.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Recording Button */}
              <div className="p-4 border-b flex items-center gap-3">
                <button
                  onClick={handleToggleRecording}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20',
                    isListening
                      ? 'bg-destructive text-destructive-foreground animate-pulse shadow-md shadow-destructive/30'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {isListening ? 'Recording...' : 'Click to Record'}
                  </p>
                  <p className="text-sm font-mono text-muted-foreground">
                    {formatDuration(duration)}
                  </p>
                </div>

                {isListening && interimTranscript && (
                  <div className="p-2 bg-muted/50 rounded-lg max-w-[150px]">
                    <p className="text-xs text-muted-foreground italic truncate">
                      {interimTranscript}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes List */}
              <div className="p-3 border-b bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">Saved Notes</p>
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No notes yet</p>
                ) : (
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-1 pr-2">
                      {notes.map(note => (
                        <button
                          key={note.id}
                          onClick={() => selectNote(note.id)}
                          className={cn(
                            'w-full text-left p-2 rounded-md transition-colors text-sm',
                            'hover:bg-accent/50',
                            note.id === activeNoteId
                              ? 'bg-accent border border-primary/20'
                              : 'bg-background/50'
                          )}
                        >
                          <p className="font-medium truncate text-xs">{note.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(note.updatedAt), 'MMM d, h:mm a')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Transcript Editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="text-sm font-medium truncate">
                    {activeNote?.title || 'No note selected'}
                  </h3>
                  {activeNote && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex-1 p-3 relative overflow-hidden">
                  <Textarea
                    value={activeNote?.content || ''}
                    onChange={(e) => activeNote && updateNote(activeNote.id, e.target.value)}
                    placeholder={activeNote ? 'Your transcription will appear here...' : 'Create or select a note'}
                    className="h-full resize-none font-mono text-sm"
                    disabled={!activeNote}
                  />
                </div>
                {/* Copy buttons */}
                {activeNote?.content && (
                  <div className="p-3 border-t flex items-center justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={handleCopyPlain}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleCopyMarkdown}>
                      <FileText className="h-3 w-3 mr-1" />
                      Markdown
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default VoiceNotesSheet;
