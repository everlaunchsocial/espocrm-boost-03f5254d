import { useState } from 'react';
import { Lead, EmailRecipient } from '@/types/crm';
import { useCRMStore } from '@/stores/crmStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { ActivityTimeline } from './ActivityTimeline';
import { LogActivityModal } from './LogActivityModal';
import { QuickTaskForm } from './QuickTaskForm';
import { NotesSection } from './NotesSection';
import { EmailComposerModal } from './EmailComposerModal';
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  CheckSquare,
  Briefcase,
  Building2,
  User,
  Pencil,
  Send,
  UserCheck,
  Globe,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface LeadDetailProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (lead: Lead) => void;
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'converted', label: 'Converted' },
];

export function LeadDetail({ lead, open, onClose, onEdit }: LeadDetailProps) {
  const { activities, tasks, notes, updateLead, convertLeadToContact } = useCRMStore();
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityType, setActivityType] = useState<'call' | 'email' | 'meeting' | 'note'>('call');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);

  if (!lead) return null;

  const leadActivities = activities.filter(
    (a) => a.relatedTo?.type === 'lead' && a.relatedTo.id === lead.id
  );

  const leadNotes = notes.filter(
    (n) => n.relatedTo.type === 'lead' && n.relatedTo.id === lead.id
  );

  const leadTasks = tasks.filter(
    (t) => t.relatedTo?.type === 'lead' && t.relatedTo.id === lead.id
  );

  const handleQuickAction = (type: 'call' | 'email' | 'meeting' | 'note') => {
    setActivityType(type);
    setActivityModalOpen(true);
  };

  const handleStatusChange = (status: Lead['status']) => {
    updateLead(lead.id, { status });
    toast.success(`Status updated to ${status}`);
  };

  const handleConvert = () => {
    convertLeadToContact(lead.id);
    toast.success('Lead converted to contact');
    onClose();
  };

  // Create email recipient from lead
  const emailRecipient: EmailRecipient = {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    title: lead.title,
    company: lead.company,
    entityType: 'lead',
  };

  const sourceLabels: Record<string, string> = {
    web: 'Website',
    referral: 'Referral',
    campaign: 'Campaign',
    social: 'Social Media',
    other: 'Other',
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-chart-4/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-semibold text-chart-4">
                    {lead.firstName[0]}{lead.lastName[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl">
                    {lead.firstName} {lead.lastName}
                  </SheetTitle>
                  <p className="text-muted-foreground">{lead.title || 'No title'}</p>
                  {lead.company && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {lead.company}
                    </p>
                  )}
                </div>
              </div>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(lead)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Status Section */}
          <div className="py-4 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Status</p>
            <Select value={lead.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Actions */}
          <div className="py-4 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setEmailComposerOpen(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('call')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Log Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Log Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('meeting')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Log Meeting
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('note')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskFormOpen(true)}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Create Task
              </Button>
              {lead.status !== 'converted' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConvert}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Convert to Contact
                </Button>
              )}
            </div>
          </div>

          {/* Lead Information */}
          <div className="py-4 border-b border-border space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Lead Information</p>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {lead.firstName} {lead.lastName}
                </span>
                {lead.title && (
                  <span className="text-xs text-muted-foreground">({lead.title})</span>
                )}
              </div>
              {lead.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.company}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-sm text-primary hover:underline">
                  {lead.email}
                </a>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.phone}`} className="text-sm hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Source: {sourceLabels[lead.source] || lead.source}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs for related data */}
          <Tabs defaultValue="notes" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="notes" className="flex-1">
                Notes ({leadNotes.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">
                Activity ({leadActivities.length})
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex-1">
                Tasks ({leadTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4">
              <NotesSection
                relatedTo={{
                  type: 'lead',
                  id: lead.id,
                  name: `${lead.firstName} ${lead.lastName}`,
                }}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {leadActivities.length > 0 ? (
                <ActivityTimeline activities={leadActivities} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activities yet. Use the quick actions above to log your first interaction.
                </p>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              {leadTasks.length > 0 ? (
                <div className="space-y-3">
                  {leadTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{task.name}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tasks for this lead.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <LogActivityModal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        type={activityType}
        relatedTo={{
          type: 'lead',
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName}`,
        }}
      />

      <QuickTaskForm
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        relatedTo={{
          type: 'lead',
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName}`,
        }}
      />

      <EmailComposerModal
        recipient={emailRecipient}
        open={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
      />
    </>
  );
}
