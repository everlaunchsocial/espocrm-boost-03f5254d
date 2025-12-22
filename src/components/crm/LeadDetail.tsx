import { useState, useEffect } from 'react';
import { Lead, EmailRecipient } from '@/types/crm';
import { useActivities, useTasks, useNotes, useUpdateLead, useConvertLeadToContact, useAddActivity } from '@/hooks/useCRMData';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useAutoTagLead } from '@/hooks/useAutoTagLead';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { ActivityTimeline } from './ActivityTimeline';
import { LogActivityModal } from './LogActivityModal';
import { QuickTaskForm } from './QuickTaskForm';
import { NotesSection } from './NotesSection';
import { EmailComposerModal } from './EmailComposerModal';
import { CallAssistant } from './CallAssistant';
import { DemoCreationModal } from '@/components/demos/DemoCreationModal';
import { PipelineStatusBadge } from './PipelineStatusBadge';
import { LeadTimelinePanel } from './LeadTimelinePanel';
import { SuggestedContactWindows } from './SuggestedContactWindows';
import { SuggestedFirstMessage } from './SuggestedFirstMessage';
import { MessagePerformanceInsights } from './MessagePerformanceInsights';
import { PreCallSummaryPanel } from './PreCallSummaryPanel';
import { LeadPresenceIndicator } from './LeadPresenceIndicator';
import { LeadViewsIndicator } from './LeadViewsIndicator';
import { LeadTagsEditor } from './LeadTagsEditor';
import { LeadStatusPredictionBadge } from './LeadStatusPredictionBadge';
import { LeadHealthScoreMeter } from './LeadHealthScoreMeter';
import { LeadAtAGlance } from './LeadAtAGlance';
import { LeadTeamNotes } from './LeadTeamNotes';
import { LeadInsightsSidebar } from './LeadInsightsSidebar';
import { AddToSequenceModal } from './AddToSequenceModal';
import { LeadPriorityToggle } from './LeadPriorityToggle';
import { LeadStatusEditor } from './LeadStatusEditor';
import { LeadSummaryCard } from './LeadSummaryCard';
import { LeadSentimentTags } from './LeadSentimentTags';
import { DemoEngagementHeatmap } from './DemoEngagementHeatmap';
import { DoneForYouToggle } from './DoneForYouToggle';
import { LeadIntentBadges } from './LeadIntentBadges';
import { LeadIntentEditor } from './LeadIntentEditor';
import { PIPELINE_STATUS_CONFIG, PipelineStatus } from '@/lib/pipelineStatus';
import {
  Phone,
  PhoneCall,
  Mail,
  Calendar,
  MessageSquare,
  CheckSquare,
  Building2,
  User,
  Pencil,
  Send,
  UserCheck,
  Globe,
  MapPin,
  Star,
  Facebook,
  Instagram,
  FileText,
  Presentation,
  ListPlus,
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

const PIPELINE_STATUSES = [
  { value: 'new_lead', label: 'New' },
  { value: 'contact_attempted', label: 'Contact attempted' },
  { value: 'demo_created', label: 'Demo created' },
  { value: 'demo_sent', label: 'Demo sent' },
  { value: 'demo_engaged', label: 'Demo engaged' },
  { value: 'ready_to_buy', label: 'Ready to buy' },
  { value: 'customer_won', label: 'Customer' },
  { value: 'lost_closed', label: 'Closed – Lost' },
];

export function LeadDetail({ lead, open, onClose, onEdit }: LeadDetailProps) {
  const { data: activities = [] } = useActivities();
  const { data: tasks = [] } = useTasks();
  const { data: notes = [] } = useNotes();
  const updateLead = useUpdateLead();
  const convertLeadToContact = useConvertLeadToContact();
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');
  const { autoTag } = useAutoTagLead();

  // Auto-tag lead when opened (Phase 2)
  useEffect(() => {
    if (phase2Enabled && lead?.id && open) {
      autoTag(lead.id);
    }
  }, [phase2Enabled, lead?.id, open, autoTag]);

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityType, setActivityType] = useState<'call' | 'email' | 'meeting' | 'note'>('call');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [emailPrefillBody, setEmailPrefillBody] = useState<string>('');
  const [callAssistantOpen, setCallAssistantOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [sequenceModalOpen, setSequenceModalOpen] = useState(false);
  const [followUpConfirmOpen, setFollowUpConfirmOpen] = useState(false);
  const [pendingFollowUpDemoId, setPendingFollowUpDemoId] = useState<string | null>(null);

  const addActivity = useAddActivity();

  const handleSendFollowUp = (demoId: string) => {
    setPendingFollowUpDemoId(demoId);
    setFollowUpConfirmOpen(true);
  };

  const confirmFollowUp = () => {
    if (!lead) return;
    
    addActivity.mutate({
      type: 'followup',
      subject: 'Follow-up sent',
      description: 'Follow-up sent after demo was watched',
      relatedTo: {
        type: 'lead',
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
      },
      isSystemGenerated: false,
    }, {
      onSuccess: () => {
        toast.success('Follow-up logged');
        setFollowUpConfirmOpen(false);
        setPendingFollowUpDemoId(null);
      },
      onError: () => {
        toast.error('Failed to log follow-up');
      }
    });
  };

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

  const handleStatusChange = async (status: Lead['status']) => {
    await updateLead.mutateAsync({ id: lead.id, lead: { status } });
    toast.success(`Status updated to ${status}`);
  };

  const handleConvert = async () => {
    await convertLeadToContact.mutateAsync(lead);
    toast.success('Lead converted to contact');
    onClose();
  };

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
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-xl">
                      {lead.firstName} {lead.lastName}
                    </SheetTitle>
                    {phase2Enabled && (
                      <LeadPriorityToggle
                        leadId={lead.id}
                        priority={lead.priority ?? false}
                      />
                    )}
                    {phase2Enabled && <LeadStatusPredictionBadge leadId={lead.id} />}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <LeadPresenceIndicator leadId={lead.id} />
                    <LeadViewsIndicator leadId={lead.id} />
                  </div>
                  <p className="text-muted-foreground">{lead.title || 'No title'}</p>
                  {lead.company && (
                    <p className="text-sm text-muted-foreground mt-1">{lead.company}</p>
                  )}
                  <LeadTagsEditor leadId={lead.id} />
                  <LeadStatusEditor lead={lead} />
                  {phase2Enabled && <LeadIntentBadges leadId={lead.id} className="mt-2" />}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(lead)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {phase2Enabled && (
                  <>
                    <LeadIntentEditor leadId={lead.id} />
                    <DoneForYouToggle 
                      leadId={lead.id} 
                      doneForYou={lead.doneForYou ?? false} 
                    />
                  </>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Lead At-A-Glance Snapshot - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <LeadAtAGlance leadId={lead.id} />
            </div>
          )}

          {/* AI Summary & Sentiment Tags - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border space-y-3">
              <LeadSentimentTags leadId={lead.id} leadName={`${lead.firstName} ${lead.lastName}`} />
              <LeadSummaryCard leadId={lead.id} leadName={`${lead.firstName} ${lead.lastName}`} />
            </div>
          )}

          {/* Status Section - hide when Phase 2 is enabled (replaced by inline editor) */}
          {!phase2Enabled && (
            <div className="py-4 border-b border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Status</p>
                  <Select value={lead.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Pipeline Status</p>
                  <Select 
                    value={lead.pipelineStatus || 'new_lead'} 
                    onValueChange={async (value) => {
                      await updateLead.mutateAsync({ id: lead.id, lead: { pipelineStatus: value as Lead['pipelineStatus'] } });
                      toast.success(`Pipeline status updated to ${PIPELINE_STATUSES.find(s => s.value === value)?.label || value}`);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="py-4 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" onClick={() => setCallAssistantOpen(true)}>
                <PhoneCall className="h-4 w-4 mr-2" />
                Start Call
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEmailComposerOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickAction('call')}>
                <Phone className="h-4 w-4 mr-2" />
                Log Call
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickAction('email')}>
                <Mail className="h-4 w-4 mr-2" />
                Log Email
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickAction('meeting')}>
                <Calendar className="h-4 w-4 mr-2" />
                Log Meeting
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickAction('note')}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Note
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTaskFormOpen(true)}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Create Task
              </Button>
              {lead.status !== 'converted' && (
                <Button variant="secondary" size="sm" onClick={handleConvert}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Convert to Contact
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setDemoModalOpen(true)}>
                <Presentation className="h-4 w-4 mr-2" />
                Create Demo
              </Button>
              {phase2Enabled && (
                <Button variant="outline" size="sm" onClick={() => setSequenceModalOpen(true)}>
                  <ListPlus className="h-4 w-4 mr-2" />
                  Add to Sequence
                </Button>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="py-4 border-b border-border space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Contact Information</p>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{lead.firstName} {lead.lastName}</span>
                {lead.title && <span className="text-xs text-muted-foreground">({lead.title})</span>}
              </div>
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-sm text-primary hover:underline">{lead.email}</a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.phone}`} className="text-sm hover:underline">{lead.phone}</a>
                </div>
              )}
            </div>
          </div>

          {/* Business Information */}
          <div className="py-4 border-b border-border space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Business Information</p>
            <div className="grid gap-3">
              {lead.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.company}</span>
                </div>
              )}
              {lead.serviceCategory && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Category: {lead.serviceCategory}</span>
                </div>
              )}
              {lead.industry && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Industry: {lead.industry}</span>
                </div>
              )}
              {(lead.address || lead.city || lead.state || lead.zipCode) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {lead.address && <div>{lead.address}</div>}
                    <div>{[lead.city, lead.state, lead.zipCode].filter(Boolean).join(', ')}</div>
                  </div>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {lead.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Source: {sourceLabels[lead.source] || lead.source}</span>
              </div>
            </div>
          </div>

          {/* Metrics & Social */}
          {(lead.googleRating || lead.facebookUrl || lead.instagramHandle) && (
            <div className="py-4 border-b border-border space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Metrics & Social</p>
              <div className="grid gap-3">
                {lead.googleRating && (
                  <div className="flex items-center gap-3">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">
                      Google Rating: {lead.googleRating}
                      {lead.googleReviewCount && ` (${lead.googleReviewCount} reviews)`}
                    </span>
                  </div>
                )}
                {lead.facebookUrl && (
                  <div className="flex items-center gap-3">
                    <Facebook className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={lead.facebookUrl.startsWith('http') ? lead.facebookUrl : `https://${lead.facebookUrl}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Facebook
                    </a>
                  </div>
                )}
                {lead.instagramHandle && (
                  <div className="flex items-center gap-3">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`https://instagram.com/${lead.instagramHandle.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      @{lead.instagramHandle.replace('@', '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lead Notes */}
          {lead.notes && (
            <div className="py-4 border-b border-border space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Lead Notes</p>
              <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Pre-Call Summary - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <PreCallSummaryPanel lead={lead} />
            </div>
          )}

          {/* Suggested Contact Windows - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <SuggestedContactWindows leadId={lead.id} />
            </div>
          )}

          {/* Lead Insights Sidebar - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <LeadInsightsSidebar leadId={lead.id} />
            </div>
          )}

          {/* Suggested First Message - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <SuggestedFirstMessage
                leadId={lead.id}
                leadName={`${lead.firstName} ${lead.lastName}`}
                leadCompany={lead.company}
                leadTitle={lead.title}
                leadIndustry={lead.industry}
                onEditAndSend={(message) => {
                  setEmailPrefillBody(message);
                  setEmailComposerOpen(true);
                }}
              />
            </div>
          )}

          {/* Message Performance Insights - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <MessagePerformanceInsights leadId={lead.id} />
            </div>
          )}

          {/* Lead Health Score Meter - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <LeadHealthScoreMeter leadId={lead.id} />
            </div>
          )}

          {/* Team Notes - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <LeadTeamNotes leadId={lead.id} />
            </div>
          )}

          {/* Demo Engagement Heatmap - Phase 2 */}
          {phase2Enabled && (
            <div className="py-4 border-b border-border">
              <DemoEngagementHeatmap 
                leadId={lead.id} 
                onSendFollowUp={() => setEmailComposerOpen(true)} 
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="notes" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="notes" className="flex-1">Notes ({leadNotes.length})</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">
                {phase2Enabled ? 'Timeline' : `Activity (${leadActivities.length})`}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex-1">Tasks ({leadTasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4">
              <NotesSection relatedTo={{ type: 'lead', id: lead.id, name: `${lead.firstName} ${lead.lastName}` }} />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {phase2Enabled ? (
                <LeadTimelinePanel 
                  leadId={lead.id}
                  leadName={`${lead.firstName} ${lead.lastName}`}
                  onSendFollowUp={handleSendFollowUp}
                />
              ) : (
                leadActivities.length > 0 ? (
                  <ActivityTimeline activities={leadActivities} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No activities yet.</p>
                )
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              {leadTasks.length > 0 ? (
                <div className="space-y-3">
                  {leadTasks.map((task) => (
                    <div key={task.id} className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{task.name}</p>
                          {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground mt-2">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks.</p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <LogActivityModal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        type={activityType}
        relatedTo={{ type: 'lead', id: lead.id, name: `${lead.firstName} ${lead.lastName}` }}
      />

      <QuickTaskForm
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        relatedTo={{ type: 'lead', id: lead.id, name: `${lead.firstName} ${lead.lastName}` }}
      />

      <EmailComposerModal
        recipient={emailRecipient}
        open={emailComposerOpen}
        onClose={() => {
          setEmailComposerOpen(false);
          setEmailPrefillBody('');
        }}
        prefillBody={emailPrefillBody}
      />

      <CallAssistant
        open={callAssistantOpen}
        onClose={() => setCallAssistantOpen(false)}
        entityType="lead"
        entityId={lead.id}
        entityName={`${lead.firstName} ${lead.lastName}`}
        company={lead.company}
        currentStatus={lead.status}
      />

      <DemoCreationModal
        open={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        leadId={lead.id}
        defaultBusinessName={lead.company || `${lead.firstName} ${lead.lastName}`}
        defaultWebsiteUrl={lead.website || ''}
      />

      {/* Follow-up Confirmation Modal */}
      <AlertDialog open={followUpConfirmOpen} onOpenChange={setFollowUpConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Follow-Up?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log a follow-up and notify the lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmFollowUp}
              disabled={addActivity.isPending}
            >
              {addActivity.isPending ? 'Sending...' : 'Send Follow-Up'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to Sequence Modal - Phase 2 */}
      {phase2Enabled && (
        <AddToSequenceModal
          leadId={lead.id}
          leadName={`${lead.firstName} ${lead.lastName}`}
          open={sequenceModalOpen}
          onClose={() => setSequenceModalOpen(false)}
        />
      )}
    </>
  );
}
