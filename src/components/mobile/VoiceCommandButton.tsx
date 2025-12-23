import { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface VoiceCommandButtonProps {
  onCommand?: (command: string) => void;
  className?: string;
}

export function VoiceCommandButton({ onCommand, className }: VoiceCommandButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      setTranscript(result[0].transcript);

      if (result.isFinal) {
        setIsProcessing(true);
        onCommand?.(result[0].transcript);
        setTimeout(() => {
          setIsListening(false);
          setIsProcessing(false);
          setTranscript('');
        }, 1500);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      if (!isProcessing) {
        setIsListening(false);
      }
    };

    recognition.start();
  }, [isSupported, onCommand, isProcessing]);

  const stopListening = () => {
    setIsListening(false);
    setTranscript('');
  };

  if (!isSupported) return null;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={cn("rounded-full", className)}
        onClick={startListening}
      >
        <Mic className="h-5 w-5" />
      </Button>

      <Dialog open={isListening} onOpenChange={(open) => !open && stopListening()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isProcessing ? 'Processing...' : 'Listening...'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-8">
            {/* Animated mic indicator */}
            <div className={cn(
              "relative h-24 w-24 rounded-full flex items-center justify-center mb-6",
              isProcessing ? "bg-primary/20" : "bg-destructive/20"
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-20",
                isProcessing ? "bg-primary" : "bg-destructive"
              )} />
              <div className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center",
                isProcessing ? "bg-primary" : "bg-destructive"
              )}>
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Mic className="h-8 w-8 text-white" />
                )}
              </div>
            </div>

            {/* Transcript display */}
            <div className="text-center min-h-[3rem]">
              {transcript ? (
                <p className="text-lg font-medium">"{transcript}"</p>
              ) : (
                <p className="text-muted-foreground">
                  Try saying: "Add lead for Mike's Plumbing"
                </p>
              )}
            </div>

            {/* Cancel button */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-6"
              onClick={stopListening}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Speech Recognition types are built into modern browsers
