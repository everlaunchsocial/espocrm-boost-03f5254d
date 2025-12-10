import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCallAssistant, formatDuration } from '@/hooks/useCallAssistant';
import { useProcessTranscript, useAddCallLog, ActionItem, SuggestedEmail } from '@/hooks/useCallLogs';
import { useAddActivity, useAddTask, useUpdateContact, useUpdateLead } from '@/hooks/useCRMData';
import { CallSummaryCard } from './CallSummaryCard';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CallAssistantProps {
  open: boolean;
  onClose: () => void;
  entityType: 'contact' | 'lead';
  entityId: string;
  entityName: string;
  company?: string;
  currentStatus: string;
}

export function CallAssistant({
  open,
  onClose,
  entityType,
  entityId,
  entityName,
  company,
  currentStatus,
}: CallAssistantProps) {
  const {
    isListening,
    transcript,
    interimTranscript,
    duration,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useCallAssistant();

  const processTranscript = useProcessTranscript();
  const addCallLog = useAddCallLog();
  const addActivity = useAddActivity();
  const addTask = useAddTask();
  const updateContact = useUpdateContact();
  const updateLead = useUpdateLead();

  const [callEnded, setCallEnded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [aiResults, setAiResults] = useState<{
    summary: string;
    actionItems: ActionItem[];
    email: SuggestedEmail | null;
    suggestedStatus: string | null;
  } | null>(null);

  const handleStartCall = () => {
    setCallEnded(false);
    setAiResults(null);
    resetTranscript();
    startListening();
  };

  const handleEndCall = async () => {
    stopListening();
    setCallEnded(true);

    const finalTranscript = transcript + interimTranscript;
    if (!finalTranscript.trim()) {
      toast.error('No speech detected. Please try again.');
      return;
    }

    setProcessing(true);
    try {
      const results = await processTranscript.mutateAsync({
        transcript: finalTranscript,
        entityType,
        entityId,
        entityName,
        company,
        currentStatus,
      });

      setAiResults(results);

      // Save call log
      await addCallLog.mutateAsync({
        contactId: entityType === 'contact' ? entityId : null,
        leadId: entityType === 'lead' ? entityId : null,
        entityType,
        transcript: finalTranscript,
        summary: results.summary,
        actionItems: results.actionItems,
        suggestedEmail: results.email,
        suggestedStatus: results.suggestedStatus,
        durationSeconds: duration,
      });

      // Log call activity
      await addActivity.mutateAsync({
        type: 'call',
        subject: `Call with ${entityName}`,
        description: results.summary,
        relatedTo: {
          type: entityType,
          id: entityId,
          name: entityName,
        },
      });

      toast.success('Call processed successfully!');
    } catch (err) {
      console.error('Error processing call:', err);
      toast.error('Failed to process call. The transcript has been saved.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateTask = async (item: ActionItem) => {
    await addTask.mutateAsync({
      name: item.task,
      priority: item.priority,
      dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      status: 'not-started',
      relatedTo: {
        type: entityType,
        id: entityId,
        name: entityName,
      },
    });
    toast.success('Task created!');
  };

  const handleCreateAllTasks = async () => {
    if (!aiResults?.actionItems.length) return;
    
    for (const item of aiResults.actionItems) {
      await handleCreateTask(item);
    }
    toast.success(`Created ${aiResults.actionItems.length} tasks!`);
  };

  const handleUpdateStatus = async (status: string) => {
    if (entityType === 'contact') {
      await updateContact.mutateAsync({
        id: entityId,
        contact: { status: status as any },
        oldStatus: currentStatus as any,
      });
    } else {
      await updateLead.mutateAsync({
        id: entityId,
        lead: { status: status as any },
      });
    }
    toast.success(`Status updated to ${status}`);
  };

  const handleClose = () => {
    if (isListening) {
      stopListening();
    }
    resetTranscript();
    setCallEnded(false);
    setAiResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5" />
              <span>Call Assistant</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-normal">
              <span className="text-muted-foreground">{entityName}</span>
              {company && <span className="text-muted-foreground">• {company}</span>}
              <span className="font-mono bg-muted px-2 py-1 rounded">
                {formatDuration(duration)}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {!isSupported ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">
              Speech recognition is not supported in this browser.<br />
              Please use Google Chrome for the best experience.
            </p>
          </div>
        ) : !callEnded ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* Transcript Area */}
            <ScrollArea className="flex-1 min-h-[300px] border rounded-lg p-4 bg-muted/30">
              <div className="space-y-2">
                {transcript && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
                )}
                {interimTranscript && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground italic">
                    {interimTranscript}
                  </p>
                )}
                {!transcript && !interimTranscript && !isListening && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Click "Start Call" to begin recording
                  </p>
                )}
                {!transcript && !interimTranscript && isListening && (
                  <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">
                    Listening... Speak clearly into your microphone
                  </p>
                )}
              </div>
            </ScrollArea>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-4">
              {!isListening ? (
                <Button
                  size="lg"
                  onClick={handleStartCall}
                  className="gap-2 px-8"
                >
                  <Mic className="h-5 w-5" />
                  Start Call
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleEndCall}
                  className="gap-2 px-8"
                >
                  <PhoneOff className="h-5 w-5" />
                  End Call
                </Button>
              )}
            </div>

            {/* Listening indicator */}
            {isListening && (
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full bg-destructive animate-pulse"
                )} />
                <span className="text-sm text-muted-foreground">Recording</span>
              </div>
            )}
          </div>
        ) : processing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing transcript with AI...</p>
          </div>
        ) : aiResults ? (
          <CallSummaryCard
            summary={aiResults.summary}
            actionItems={aiResults.actionItems}
            email={aiResults.email}
            suggestedStatus={aiResults.suggestedStatus}
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
            onCreateTask={handleCreateTask}
            onCreateAllTasks={handleCreateAllTasks}
            onUpdateStatus={handleUpdateStatus}
            onClose={handleClose}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No results available</p>
            <Button onClick={() => setCallEnded(false)}>Try Again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
