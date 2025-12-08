import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact, Account, Lead, Deal, Task, Activity, Note, ContactStatus } from '@/types/crm';
import { toast } from 'sonner';

// Helper to convert snake_case DB rows to camelCase
const toContact = (row: any): Contact => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone || '',
  cellPhone: row.cell_phone,
  accountId: row.account_id,
  accountName: row.accounts?.name,
  title: row.title,
  secondaryContactName: row.secondary_contact_name,
  secondaryContactEmail: row.secondary_contact_email,
  secondaryContactPhone: row.secondary_contact_phone,
  status: row.status as ContactStatus,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const toAccount = (row: any): Account => ({
  id: row.id,
  name: row.name,
  website: row.website,
  industry: row.industry,
  phone: row.phone,
  email: row.email,
  companyEmail: row.company_email,
  address: row.address,
  city: row.city,
  state: row.state,
  zipCode: row.zip_code,
  country: row.country,
  type: row.type as 'customer' | 'partner' | 'prospect',
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const toLead = (row: any): Lead => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  company: row.company,
  title: row.title,
  source: row.source as Lead['source'],
  status: row.status as Lead['status'],
  pipelineStatus: (row.pipeline_status || 'new_lead') as Lead['pipelineStatus'],
  // Address fields
  address: row.address,
  city: row.city,
  state: row.state,
  zipCode: row.zip_code,
  // Business fields
  website: row.website,
  serviceCategory: row.service_category,
  industry: row.industry,
  // Social media
  facebookUrl: row.facebook_url,
  instagramHandle: row.instagram_handle,
  // Metrics
  googleRating: row.google_rating ? Number(row.google_rating) : undefined,
  googleReviewCount: row.google_review_count,
  // Flags
  hasWebsite: row.has_website,
  notes: row.notes,
  // Import tracking
  importBatchId: row.import_batch_id,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const toDeal = (row: any): Deal => ({
  id: row.id,
  name: row.name,
  accountId: row.account_id,
  accountName: row.accounts?.name,
  contactId: row.contact_id,
  contactName: row.contacts ? `${row.contacts.first_name} ${row.contacts.last_name}` : undefined,
  amount: Number(row.amount),
  stage: row.stage as Deal['stage'],
  probability: row.probability,
  expectedCloseDate: row.expected_close_date ? new Date(row.expected_close_date) : undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const toTask = (row: any): Task => ({
  id: row.id,
  name: row.name,
  description: row.description,
  status: row.status as Task['status'],
  priority: row.priority as Task['priority'],
  dueDate: row.due_date ? new Date(row.due_date) : undefined,
  assignedTo: row.assigned_to,
  relatedTo: row.related_to_type ? {
    type: row.related_to_type as 'contact' | 'account' | 'lead' | 'deal',
    id: row.related_to_id,
    name: row.related_to_name,
  } : undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const toActivity = (row: any): Activity => ({
  id: row.id,
  type: row.type as Activity['type'],
  subject: row.subject,
  description: row.description,
  relatedTo: row.related_to_type ? {
    type: row.related_to_type as 'contact' | 'account' | 'lead' | 'deal',
    id: row.related_to_id,
    name: row.related_to_name,
  } : undefined,
  createdAt: new Date(row.created_at),
  isSystemGenerated: row.is_system_generated,
});

const toNote = (row: any): Note => ({
  id: row.id,
  content: row.content,
  relatedTo: {
    type: row.related_to_type as 'contact' | 'account' | 'lead' | 'deal',
    id: row.related_to_id,
    name: row.related_to_name,
  },
  createdBy: row.created_by,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// ============ CONTACTS ============
export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, accounts(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toContact);
    },
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase.from('contacts').insert({
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        cell_phone: contact.cellPhone,
        account_id: contact.accountId,
        title: contact.title,
        secondary_contact_name: contact.secondaryContactName,
        secondary_contact_email: contact.secondaryContactEmail,
        secondary_contact_phone: contact.secondaryContactPhone,
        status: contact.status,
      }).select().single();
      if (error) throw error;
      
      // Log activity
      await supabase.from('activities').insert({
        type: 'status-change',
        subject: `Contact created: ${contact.firstName} ${contact.lastName}`,
        related_to_type: 'contact',
        related_to_id: data.id,
        related_to_name: `${contact.firstName} ${contact.lastName}`,
        is_system_generated: true,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contact, oldStatus }: { id: string; contact: Partial<Contact>; oldStatus?: ContactStatus }) => {
      const updateData: any = {};
      if (contact.firstName !== undefined) updateData.first_name = contact.firstName;
      if (contact.lastName !== undefined) updateData.last_name = contact.lastName;
      if (contact.email !== undefined) updateData.email = contact.email;
      if (contact.phone !== undefined) updateData.phone = contact.phone;
      if (contact.cellPhone !== undefined) updateData.cell_phone = contact.cellPhone;
      if (contact.accountId !== undefined) updateData.account_id = contact.accountId;
      if (contact.title !== undefined) updateData.title = contact.title;
      if (contact.secondaryContactName !== undefined) updateData.secondary_contact_name = contact.secondaryContactName;
      if (contact.secondaryContactEmail !== undefined) updateData.secondary_contact_email = contact.secondaryContactEmail;
      if (contact.secondaryContactPhone !== undefined) updateData.secondary_contact_phone = contact.secondaryContactPhone;
      if (contact.status !== undefined) updateData.status = contact.status;

      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Log status change activity
      if (oldStatus && contact.status && oldStatus !== contact.status) {
        await supabase.from('activities').insert({
          type: 'status-change',
          subject: `Status changed to ${contact.status}`,
          description: `Contact status updated from ${oldStatus} to ${contact.status}`,
          related_to_type: 'contact',
          related_to_id: id,
          related_to_name: `${data.first_name} ${data.last_name}`,
          is_system_generated: true,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

// ============ ACCOUNTS ============
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toAccount);
    },
  });
}

export function useAddAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase.from('accounts').insert({
        name: account.name,
        website: account.website,
        industry: account.industry,
        phone: account.phone,
        email: account.email,
        company_email: account.companyEmail,
        address: account.address,
        city: account.city,
        state: account.state,
        zip_code: account.zipCode,
        country: account.country,
        type: account.type,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, account }: { id: string; account: Partial<Account> }) => {
      const updateData: any = {};
      if (account.name !== undefined) updateData.name = account.name;
      if (account.website !== undefined) updateData.website = account.website;
      if (account.industry !== undefined) updateData.industry = account.industry;
      if (account.phone !== undefined) updateData.phone = account.phone;
      if (account.email !== undefined) updateData.email = account.email;
      if (account.companyEmail !== undefined) updateData.company_email = account.companyEmail;
      if (account.address !== undefined) updateData.address = account.address;
      if (account.city !== undefined) updateData.city = account.city;
      if (account.state !== undefined) updateData.state = account.state;
      if (account.zipCode !== undefined) updateData.zip_code = account.zipCode;
      if (account.country !== undefined) updateData.country = account.country;
      if (account.type !== undefined) updateData.type = account.type;

      const { error } = await supabase.from('accounts').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

// ============ LEADS ============
export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toLead);
    },
  });
}

export function useAddLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> & { affiliateId?: string }) => {
      const { data, error } = await supabase.from('leads').insert({
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email || null,
        phone: lead.phone,
        company: lead.company,
        title: lead.title,
        source: lead.source,
        status: lead.status,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zipCode,
        website: lead.website,
        service_category: lead.serviceCategory,
        industry: lead.industry,
        facebook_url: lead.facebookUrl,
        instagram_handle: lead.instagramHandle,
        google_rating: lead.googleRating,
        google_review_count: lead.googleReviewCount,
        has_website: lead.hasWebsite,
        notes: lead.notes,
        import_batch_id: lead.importBatchId,
        affiliate_id: lead.affiliateId || null,
      }).select().single();
      if (error) throw error;

      await supabase.from('activities').insert({
        type: 'status-change',
        subject: `Lead created: ${lead.firstName} ${lead.lastName}`,
        related_to_type: 'lead',
        related_to_id: data.id,
        related_to_name: `${lead.firstName} ${lead.lastName}`,
        is_system_generated: true,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lead }: { id: string; lead: Partial<Lead> }) => {
      const updateData: any = {};
      if (lead.firstName !== undefined) updateData.first_name = lead.firstName;
      if (lead.lastName !== undefined) updateData.last_name = lead.lastName;
      if (lead.email !== undefined) updateData.email = lead.email;
      if (lead.phone !== undefined) updateData.phone = lead.phone;
      if (lead.company !== undefined) updateData.company = lead.company;
      if (lead.title !== undefined) updateData.title = lead.title;
      if (lead.source !== undefined) updateData.source = lead.source;
      if (lead.status !== undefined) updateData.status = lead.status;
      if (lead.pipelineStatus !== undefined) updateData.pipeline_status = lead.pipelineStatus;
      if (lead.address !== undefined) updateData.address = lead.address;
      if (lead.city !== undefined) updateData.city = lead.city;
      if (lead.state !== undefined) updateData.state = lead.state;
      if (lead.zipCode !== undefined) updateData.zip_code = lead.zipCode;
      if (lead.website !== undefined) updateData.website = lead.website;
      if (lead.serviceCategory !== undefined) updateData.service_category = lead.serviceCategory;
      if (lead.industry !== undefined) updateData.industry = lead.industry;
      if (lead.facebookUrl !== undefined) updateData.facebook_url = lead.facebookUrl;
      if (lead.instagramHandle !== undefined) updateData.instagram_handle = lead.instagramHandle;
      if (lead.googleRating !== undefined) updateData.google_rating = lead.googleRating;
      if (lead.googleReviewCount !== undefined) updateData.google_review_count = lead.googleReviewCount;
      if (lead.hasWebsite !== undefined) updateData.has_website = lead.hasWebsite;
      if (lead.notes !== undefined) updateData.notes = lead.notes;

      const { error } = await supabase.from('leads').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

// Bulk import leads with batch tracking for rollback
export function useBulkImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leads, affiliateId }: { leads: Array<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>, affiliateId?: string }) => {
      const batchId = crypto.randomUUID();
      
      const leadsToInsert = leads.map(lead => ({
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email || null,
        phone: lead.phone,
        company: lead.company,
        title: lead.title,
        source: lead.source,
        status: lead.status,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zipCode,
        website: lead.website,
        service_category: lead.serviceCategory,
        industry: lead.industry,
        facebook_url: lead.facebookUrl,
        instagram_handle: lead.instagramHandle,
        google_rating: lead.googleRating,
        google_review_count: lead.googleReviewCount,
        has_website: lead.hasWebsite,
        notes: lead.notes,
        import_batch_id: batchId,
        affiliate_id: affiliateId || null,
      }));

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();
      
      if (error) throw error;
      
      return { batchId, count: data.length, leads: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Rollback/delete leads by batch ID
export function useRollbackLeadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .eq('import_batch_id', batchId)
        .select();
      
      if (error) throw error;
      return { deletedCount: data.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Import rolled back successfully');
    },
  });
}

export function useConvertLeadToContact() {
  const queryClient = useQueryClient();
  const addContact = useAddContact();
  const updateLead = useUpdateLead();

  return useMutation({
    mutationFn: async (lead: Lead) => {
      // Add as contact (use placeholder email if none provided)
      await addContact.mutateAsync({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email || `${lead.firstName.toLowerCase()}.${lead.lastName.toLowerCase()}@placeholder.com`,
        phone: lead.phone || '',
        title: lead.title,
        status: 'lead',
      });
      // Mark lead as converted
      await updateLead.mutateAsync({ id: lead.id, lead: { status: 'converted' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

// ============ DEALS ============
export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, accounts(name), contacts(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toDeal);
    },
  });
}

export function useAddDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase.from('deals').insert({
        name: deal.name,
        account_id: deal.accountId,
        contact_id: deal.contactId,
        amount: deal.amount,
        stage: deal.stage,
        probability: deal.probability,
        expected_close_date: deal.expectedCloseDate?.toISOString().split('T')[0],
      }).select().single();
      if (error) throw error;

      await supabase.from('activities').insert({
        type: 'status-change',
        subject: `Deal created: ${deal.name}`,
        related_to_type: 'deal',
        related_to_id: data.id,
        related_to_name: deal.name,
        is_system_generated: true,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deal }: { id: string; deal: Partial<Deal> }) => {
      const updateData: any = {};
      if (deal.name !== undefined) updateData.name = deal.name;
      if (deal.accountId !== undefined) updateData.account_id = deal.accountId;
      if (deal.contactId !== undefined) updateData.contact_id = deal.contactId;
      if (deal.amount !== undefined) updateData.amount = deal.amount;
      if (deal.stage !== undefined) updateData.stage = deal.stage;
      if (deal.probability !== undefined) updateData.probability = deal.probability;
      if (deal.expectedCloseDate !== undefined) updateData.expected_close_date = deal.expectedCloseDate?.toISOString().split('T')[0];

      const { error } = await supabase.from('deals').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

// ============ TASKS ============
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toTask);
    },
  });
}

export function useAddTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { error } = await supabase.from('tasks').insert({
        name: task.name,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate?.toISOString().split('T')[0],
        assigned_to: task.assignedTo,
        related_to_type: task.relatedTo?.type,
        related_to_id: task.relatedTo?.id,
        related_to_name: task.relatedTo?.name,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task }: { id: string; task: Partial<Task> }) => {
      const updateData: any = {};
      if (task.name !== undefined) updateData.name = task.name;
      if (task.description !== undefined) updateData.description = task.description;
      if (task.status !== undefined) updateData.status = task.status;
      if (task.priority !== undefined) updateData.priority = task.priority;
      if (task.dueDate !== undefined) updateData.due_date = task.dueDate?.toISOString().split('T')[0];
      if (task.assignedTo !== undefined) updateData.assigned_to = task.assignedTo;

      const { error } = await supabase.from('tasks').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ============ ACTIVITIES ============
export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toActivity);
    },
  });
}

export function useAddActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activity: Omit<Activity, 'id' | 'createdAt'>) => {
      const { error } = await supabase.from('activities').insert({
        type: activity.type,
        subject: activity.subject,
        description: activity.description,
        related_to_type: activity.relatedTo?.type,
        related_to_id: activity.relatedTo?.id,
        related_to_name: activity.relatedTo?.name,
        is_system_generated: activity.isSystemGenerated,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
  });
}

// ============ NOTES ============
export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toNote);
    },
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { error } = await supabase.from('notes').insert({
        content: note.content,
        related_to_type: note.relatedTo.type,
        related_to_id: note.relatedTo.id,
        related_to_name: note.relatedTo.name,
        created_by: note.createdBy,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: Partial<Note> }) => {
      const updateData: any = {};
      if (note.content !== undefined) updateData.content = note.content;

      const { error } = await supabase.from('notes').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

// ============ EMAILS ============
export interface Email {
  id: string;
  contactId: string;
  senderAddress: string;
  senderName: string | null;
  toEmail: string;
  toName: string | null;
  subject: string;
  body: string;
  status: string;
  trackingId: string;
  openCount: number;
  openedAt: Date | null;
  sentAt: Date;
  createdAt: Date;
}

const toEmail = (row: any): Email => ({
  id: row.id,
  contactId: row.contact_id,
  senderAddress: row.sender_address,
  senderName: row.sender_name,
  toEmail: row.to_email,
  toName: row.to_name,
  subject: row.subject,
  body: row.body,
  status: row.status,
  trackingId: row.tracking_id,
  openCount: row.open_count,
  openedAt: row.opened_at ? new Date(row.opened_at) : null,
  sentAt: new Date(row.sent_at),
  createdAt: new Date(row.created_at),
});

export function useEmails(entityId?: string) {
  return useQuery({
    queryKey: ['emails', entityId],
    queryFn: async () => {
      let query = supabase
        .from('emails')
        .select('*')
        .order('sent_at', { ascending: false });
      
      if (entityId) {
        query = query.eq('contact_id', entityId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data.map(toEmail);
    },
    enabled: !!entityId || entityId === undefined,
  });
}

// Inbox emails (received replies)
export function useInboxEmails() {
  return useQuery({
    queryKey: ['emails', 'inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('status', 'received')
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return data.map(toEmail);
    },
  });
}

// Sent emails (all outbound)
export function useSentEmails() {
  return useQuery({
    queryKey: ['emails', 'sent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .in('status', ['sent', 'opened', 'pending', 'failed'])
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return data.map(toEmail);
    },
  });
}

// All emails for the dashboard
export function useAllEmails() {
  return useQuery({
    queryKey: ['emails', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return data.map(toEmail);
    },
  });
}
