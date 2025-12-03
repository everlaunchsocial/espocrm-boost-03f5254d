import { useState } from 'react';
import { Contact, Activity, Deal, Task } from '@/types/crm';
import { useCRMStore } from '@/stores/crmStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { StatusDropdown } from './StatusDropdown';
import { ActivityTimeline } from './ActivityTimeline';
import { LogActivityModal } from './LogActivityModal';
import { QuickTaskForm } from './QuickTaskForm';
import {
  Phone,
  Mail,
  MessageSquare,
  CheckSquare,
  Briefcase,
  Building2,
  User,
  Calendar,
  ExternalLink,
  Globe,
  MapPin,
  Pencil,
  Smartphone,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface ContactDetailProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (contact: Contact) => void;
}

export function ContactDetail({ contact, open, onClose, onEdit }: ContactDetailProps) {
  const { activities, deals, tasks, accounts, updateContact } = useCRMStore();
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityType, setActivityType] = useState<'call' | 'email' | 'meeting' | 'note'>('call');
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  if (!contact) return null;

  const contactActivities = activities.filter(
    (a) => a.relatedTo?.type === 'contact' && a.relatedTo.id === contact.id
  );

  const contactDeals = deals.filter((d) => d.contactId === contact.id);
  const contactTasks = tasks.filter(
    (t) => t.relatedTo?.type === 'contact' && t.relatedTo.id === contact.id
  );

  // Get linked account for business info
  const linkedAccount = contact.accountId 
    ? accounts.find((a) => a.id === contact.accountId) 
    : null;

  const handleQuickAction = (type: 'call' | 'email' | 'meeting' | 'note') => {
    setActivityType(type);
    setActivityModalOpen(true);
  };

  const handleStatusChange = (status: typeof contact.status) => {
    updateContact(contact.id, { status });
  };

  const formatAddress = () => {
    if (!linkedAccount) return null;
    const parts = [
      linkedAccount.address,
      linkedAccount.city,
      linkedAccount.state,
      linkedAccount.zipCode,
      linkedAccount.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-semibold text-primary">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl">
                    {contact.firstName} {contact.lastName}
                  </SheetTitle>
                  <p className="text-muted-foreground">{contact.title || 'No title'}</p>
                  {linkedAccount && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {linkedAccount.name}
                    </p>
                  )}
                </div>
              </div>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(contact)}
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
            <StatusDropdown
              value={contact.status}
              onChange={handleStatusChange}
              className="w-48"
            />
          </div>

          {/* Quick Actions */}
          <div className="py-4 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>

          {/* Business Information */}
          {linkedAccount && (
            <div className="py-4 border-b border-border space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Business Information</p>
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{linkedAccount.name}</span>
                  {linkedAccount.industry && (
                    <span className="text-xs text-muted-foreground">({linkedAccount.industry})</span>
                  )}
                </div>
                {formatAddress() && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{formatAddress()}</span>
                  </div>
                )}
                {linkedAccount.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={linkedAccount.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {linkedAccount.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {(linkedAccount.companyEmail || linkedAccount.email) && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${linkedAccount.companyEmail || linkedAccount.email}`} 
                      className="text-sm text-primary hover:underline"
                    >
                      {linkedAccount.companyEmail || linkedAccount.email}
                    </a>
                  </div>
                )}
                {linkedAccount.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${linkedAccount.phone}`} className="text-sm hover:underline">
                      {linkedAccount.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Primary Contact Info */}
          <div className="py-4 border-b border-border space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Primary Contact</p>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {contact.firstName} {contact.lastName}
                </span>
                {contact.title && (
                  <span className="text-xs text-muted-foreground">({contact.title})</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline">
                  {contact.email}
                </a>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
                    {contact.phone}
                  </a>
                  <span className="text-xs text-muted-foreground">(Business)</span>
                </div>
              )}
              {contact.cellPhone && (
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.cellPhone}`} className="text-sm hover:underline">
                    {contact.cellPhone}
                  </a>
                  <span className="text-xs text-muted-foreground">(Cell)</span>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Contact Info */}
          {(contact.secondaryContactName || contact.secondaryContactEmail || contact.secondaryContactPhone) && (
            <div className="py-4 border-b border-border space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Secondary Contact</p>
              <div className="grid gap-3">
                {contact.secondaryContactName && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.secondaryContactName}</span>
                  </div>
                )}
                {contact.secondaryContactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.secondaryContactEmail}`} className="text-sm text-primary hover:underline">
                      {contact.secondaryContactEmail}
                    </a>
                  </div>
                )}
                {contact.secondaryContactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.secondaryContactPhone}`} className="text-sm hover:underline">
                      {contact.secondaryContactPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs for related data */}
          <Tabs defaultValue="activity" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="activity" className="flex-1">
                Activity ({contactActivities.length})
              </TabsTrigger>
              <TabsTrigger value="deals" className="flex-1">
                Deals ({contactDeals.length})
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex-1">
                Tasks ({contactTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4">
              {contactActivities.length > 0 ? (
                <ActivityTimeline activities={contactActivities} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activities yet. Use the quick actions above to log your first interaction.
                </p>
              )}
            </TabsContent>

            <TabsContent value="deals" className="mt-4">
              {contactDeals.length > 0 ? (
                <div className="space-y-3">
                  {contactDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{deal.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${deal.amount.toLocaleString()} • {deal.stage}
                          </p>
                        </div>
                        <StatusBadge status={deal.stage} />
                      </div>
                      {deal.expectedCloseDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Expected close: {format(new Date(deal.expectedCloseDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No deals associated with this contact.
                </p>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              {contactTasks.length > 0 ? (
                <div className="space-y-3">
                  {contactTasks.map((task) => (
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
                          Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tasks for this contact.
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
          type: 'contact',
          id: contact.id,
          name: `${contact.firstName} ${contact.lastName}`,
        }}
      />

      <QuickTaskForm
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        relatedTo={{
          type: 'contact',
          id: contact.id,
          name: `${contact.firstName} ${contact.lastName}`,
        }}
      />
    </>
  );
}
