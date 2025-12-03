import { useState } from 'react';
import { useInboxEmails, useSentEmails, useContacts, useLeads } from '@/hooks/useCRMData';
import { Contact, Lead } from '@/types/crm';
import { ContactDetail } from '@/components/crm/ContactDetail';
import { LeadDetail } from '@/components/crm/LeadDetail';
import { EmailStatusIndicator } from '@/components/crm/EmailStatusIndicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Inbox, Send, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function Email() {
  const { data: inboxEmails = [], isLoading: inboxLoading } = useInboxEmails();
  const { data: sentEmails = [], isLoading: sentLoading } = useSentEmails();
  const { data: contacts = [] } = useContacts();
  const { data: leads = [] } = useLeads();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Lookup contact or lead by ID
  const findEntity = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) return { type: 'contact' as const, entity: contact };
    
    const lead = leads.find(l => l.id === contactId);
    if (lead) return { type: 'lead' as const, entity: lead };
    
    return null;
  };

  const handleEmailClick = (contactId: string) => {
    const result = findEntity(contactId);
    if (result?.type === 'contact') {
      setSelectedContact(result.entity as Contact);
      setSelectedLead(null);
      setDetailOpen(true);
    } else if (result?.type === 'lead') {
      setSelectedLead(result.entity as Lead);
      setSelectedContact(null);
      setDetailOpen(true);
    }
  };

  const filterEmails = (emails: typeof sentEmails) => {
    if (!searchTerm) return emails;
    const term = searchTerm.toLowerCase();
    return emails.filter(email => 
      email.subject.toLowerCase().includes(term) ||
      email.toEmail.toLowerCase().includes(term) ||
      email.toName?.toLowerCase().includes(term) ||
      email.body.toLowerCase().includes(term)
    );
  };

  const getEntityName = (contactId: string) => {
    const result = findEntity(contactId);
    if (result?.type === 'contact') {
      const c = result.entity as Contact;
      return `${c.firstName} ${c.lastName}`;
    } else if (result?.type === 'lead') {
      const l = result.entity as Lead;
      return `${l.firstName} ${l.lastName}`;
    }
    return 'Unknown';
  };

  const EmailTable = ({ emails, type }: { emails: typeof sentEmails; type: 'inbox' | 'sent' }) => {
    const filtered = filterEmails(emails);

    if (emails.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {type === 'inbox' ? (
            <>
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No received emails yet.</p>
              <p className="text-sm text-muted-foreground/70">Replies from contacts will appear here.</p>
            </>
          ) : (
            <>
              <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No emails sent yet.</p>
              <p className="text-sm text-muted-foreground/70">Send an email from a contact or lead page.</p>
            </>
          )}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{type === 'inbox' ? 'From' : 'To'}</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Contact/Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((email) => (
            <TableRow 
              key={email.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleEmailClick(email.contactId)}
            >
              <TableCell className="font-medium">
                {type === 'inbox' 
                  ? email.toName || email.toEmail 
                  : email.toName || email.toEmail
                }
              </TableCell>
              <TableCell>
                <div className="max-w-[300px]">
                  <p className="truncate font-medium">{email.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {email.body.replace(/<[^>]*>/g, '').slice(0, 80)}...
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-normal">
                  {getEntityName(email.contactId)}
                </Badge>
              </TableCell>
              <TableCell>
                {type === 'inbox' ? (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Reply
                  </Badge>
                ) : (
                  <EmailStatusIndicator 
                    status={email.openCount > 0 ? 'opened' : email.status as 'pending' | 'sent' | 'opened' | 'failed'}
                    openedAt={email.openedAt?.toISOString()}
                    openCount={email.openCount}
                  />
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(email.sentAt, 'MMM d, yyyy h:mm a')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email</h1>
          <p className="text-muted-foreground">Manage your inbox and sent emails</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbox</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboxEmails.length}</div>
            <p className="text-xs text-muted-foreground">Received replies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentEmails.length}</div>
            <p className="text-xs text-muted-foreground">Emails sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sentEmails.filter(e => e.openCount > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {sentEmails.length > 0 
                ? `${Math.round((sentEmails.filter(e => e.openCount > 0).length / sentEmails.length) * 100)}% open rate`
                : 'No emails sent yet'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="inbox">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="inbox" className="gap-2">
                  <Inbox className="h-4 w-4" />
                  Inbox ({inboxEmails.length})
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-2">
                  <Send className="h-4 w-4" />
                  Sent ({sentEmails.length})
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <TabsContent value="inbox" className="mt-0">
              {inboxLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : (
                <EmailTable emails={inboxEmails} type="inbox" />
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-0">
              {sentLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : (
                <EmailTable emails={sentEmails} type="sent" />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Contact Detail Panel */}
      <ContactDetail
        contact={selectedContact}
        open={detailOpen && selectedContact !== null}
        onClose={() => {
          setDetailOpen(false);
          setSelectedContact(null);
        }}
      />

      {/* Lead Detail Panel */}
      <LeadDetail
        lead={selectedLead}
        open={detailOpen && selectedLead !== null}
        onClose={() => {
          setDetailOpen(false);
          setSelectedLead(null);
        }}
      />
    </div>
  );
}
