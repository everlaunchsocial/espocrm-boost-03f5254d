import { useState, useRef, useEffect, useCallback } from 'react';
import { useAddNote } from '@/hooks/useCRMData';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuickAddNoteProps {
  leadId: string;
  leadName: string;
}

// Check if speech recognition is supported
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export function QuickAddNote({ leadId, leadName }: QuickAddNoteProps) {
  const [noteContent, setNoteContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const addNote = useAddNote();
  const queryClient = useQueryClient();

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) return null;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setNoteContent(prev => (prev + finalTranscript).trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable microphone permissions.');
      } else if (event.error !== 'aborted') {
        toast.error('Voice input error. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return recognition;
  }, []);

  // Start voice recording
  const startRecording = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      toast.error('Voice input not supported on this browser.');
      return;
    }

    try {
      recognitionRef.current = initRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
        setIsExpanded(true);
        textareaRef.current?.focus();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start voice input.');
    }
  }, [initRecognition]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle submit
  const handleSubmit = async () => {
    if (!noteContent.trim()) return;

    setIsSubmitting(true);
    try {
      await addNote.mutateAsync({
        content: noteContent.trim(),
        relatedTo: {
          type: 'lead',
          id: leadId,
          name: leadName,
        },
        createdBy: 'Current User',
      });

      // Also invalidate timeline query to refresh the view
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', leadId] });
      
      setNoteContent('');
      setIsExpanded(false);
      toast.success('Note added');
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const speechSupported = isSpeechRecognitionSupported();

  return (
    <div className="mb-4 rounded-lg border border-border bg-card overflow-hidden">
      {/* Collapsed View - Single Line */}
      {!isExpanded ? (
        <div 
          className="flex items-center gap-2 p-2 cursor-text hover:bg-muted/30 transition-colors"
          onClick={() => {
            setIsExpanded(true);
            setTimeout(() => textareaRef.current?.focus(), 0);
          }}
        >
          <input
            type="text"
            placeholder="Add a quick note..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            className="flex-1 bg-transparent text-sm border-0 outline-none placeholder:text-muted-foreground"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 flex-shrink-0",
                    !speechSupported && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRecording();
                  }}
                  disabled={!speechSupported}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {speechSupported ? 'Start voice input' : 'Voice input not supported on this browser'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : (
        /* Expanded View */
        <div className="p-3 space-y-2">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Add a note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "min-h-[80px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-10",
                isRecording && "border-l-2 border-l-red-500 pl-2"
              )}
              autoFocus
            />
            {isRecording && (
              <div className="absolute top-0 right-0 flex items-center gap-1 text-xs text-red-500 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Recording...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      className="h-8"
                      onClick={toggleRecording}
                      disabled={!speechSupported}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-4 w-4 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-1" />
                          Voice
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!speechSupported 
                      ? 'Voice input not supported on this browser' 
                      : isRecording 
                        ? 'Stop recording' 
                        : 'Start voice input'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-xs text-muted-foreground">
                Cmd/Ctrl + Enter to save
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => {
                  setIsExpanded(false);
                  stopRecording();
                }}
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse
              </Button>
              <Button
                size="sm"
                className="h-8"
                onClick={handleSubmit}
                disabled={!noteContent.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Add Note
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
