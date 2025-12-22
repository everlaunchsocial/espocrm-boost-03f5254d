import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EmailComposerModal } from './EmailComposerModal';
import { CallOutcomeBadge } from './CallOutcomeBadge';
import { EmailRecipient } from '@/types/crm';
import { ActionItem, SuggestedEmail } from '@/hooks/useCallLogs';
import {
  CheckCircle2,
  ListTodo,
  Mail,
  RefreshCw,
  Check,
  Plus,
  Phone,
} from 'lucide-react';
import { format } from 'date-fns';

interface CallSummaryCardProps {
  summary: string;
  actionItems: ActionItem[];
  email: SuggestedEmail | null;
  suggestedStatus: string | null;
  entityType: 'contact' | 'lead';
  entityId: string;
  entityName: string;
  callLogId?: string;
  durationSeconds?: number | null;
  transcript?: string;
  aiOutcome?: string | null;
  aiOutcomeConfidence?: number | null;
  aiOutcomeReason?: string | null;
  onCreateTask: (item: ActionItem) => Promise<void>;
  onCreateAllTasks: () => Promise<void>;
  onUpdateStatus: (status: string) => Promise<void>;
  onClose: () => void;
}

export function CallSummaryCard({
  summary,
  actionItems,
  email,
  suggestedStatus,
  entityType,
  entityId,
  entityName,
  callLogId,
  durationSeconds,
  transcript,
  aiOutcome,
  aiOutcomeConfidence,
  aiOutcomeReason,
  onCreateTask,
  onCreateAllTasks,
  onUpdateStatus,
  onClose,
}: CallSummaryCardProps) {
  const [createdTasks, setCreatedTasks] = useState<Set<number>>(new Set());
  const [statusUpdated, setStatusUpdated] = useState(false);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [creatingAll, setCreatingAll] = useState(false);

  const handleCreateTask = async (item: ActionItem, index: number) => {
    await onCreateTask(item);
    setCreatedTasks(prev => new Set([...prev, index]));
  };

  const handleCreateAll = async () => {
    setCreatingAll(true);
    await onCreateAllTasks();
    setCreatedTasks(new Set(actionItems.map((_, i) => i)));
    setCreatingAll(false);
  };

  const handleUpdateStatus = async () => {
    if (suggestedStatus) {
      await onUpdateStatus(suggestedStatus);
      setStatusUpdated(true);
    }
  };

  // Build email recipient from entity info
  const emailRecipient: EmailRecipient = {
    id: entityId,
    firstName: entityName.split(' ')[0] || entityName,
    lastName: entityName.split(' ').slice(1).join(' ') || '',
    email: '', // Will be filled by the composer from the entity
    entityType,
  };

  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-6 py-4">
        {/* Call Outcome */}
        {callLogId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-primary" />
              Call Outcome
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <CallOutcomeBadge
                callLogId={callLogId}
                outcome={aiOutcome}
                confidence={aiOutcomeConfidence}
                reason={aiOutcomeReason}
                durationSeconds={durationSeconds}
                transcript={transcript}
              />
            </div>
          </div>
        )}

        {callLogId && <Separator />}

        {/* Summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Summary
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
            {summary}
          </p>
        </div>

        <Separator />

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListTodo className="h-4 w-4 text-primary" />
                Action Items ({actionItems.length})
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateAll}
                disabled={creatingAll || createdTasks.size === actionItems.length}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create All Tasks
              </Button>
            </div>
            <div className="space-y-2">
              {actionItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.task}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {item.dueDate && (
                        <span>Due: {format(new Date(item.dueDate), 'MMM d, yyyy')}</span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        item.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                        item.priority === 'medium' ? 'bg-chart-4/10 text-chart-4' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={createdTasks.has(index) ? 'ghost' : 'outline'}
                    size="sm"
                    onClick={() => handleCreateTask(item, index)}
                    disabled={createdTasks.has(index)}
                  >
                    {createdTasks.has(index) ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Created
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Create Task
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {actionItems.length > 0 && (email || suggestedStatus) && <Separator />}

        {/* Draft Email */}
        {email && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" />
              Draft Email
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-2">
              <p className="text-sm font-medium">Subject: {email.subject}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {email.body}
              </p>
            </div>
            <Button onClick={() => setEmailComposerOpen(true)} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Edit & Send Email
            </Button>
          </div>
        )}

        {email && suggestedStatus && <Separator />}

        {/* Suggested Status */}
        {suggestedStatus && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4 text-primary" />
              Suggested Status Update
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <span className="text-sm">
                Update status to: <strong className="capitalize">{suggestedStatus}</strong>
              </span>
              <Button
                variant={statusUpdated ? 'ghost' : 'outline'}
                size="sm"
                onClick={handleUpdateStatus}
                disabled={statusUpdated}
              >
                {statusUpdated ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Updated
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>

      {/* Email Composer Modal - pass pre-filled subject/body */}
      <EmailComposerModal
        recipient={emailRecipient}
        open={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
        prefillSubject={email?.subject}
        prefillBody={email?.body}
      />
    </ScrollArea>
  );
}
