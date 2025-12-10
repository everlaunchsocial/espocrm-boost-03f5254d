import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerLead {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  source: string;
  message: string | null;
  notes: string | null;
  pipeline_status: string;
}

export type DateRangeFilter = 'last7days' | 'last30days' | 'thisMonth' | 'allTime';
export type SourceFilter = 'all' | 'phone' | 'chat' | 'voice_web' | 'checkout';

interface UseCustomerLeadsOptions {
  dateRange?: DateRangeFilter;
  source?: SourceFilter;
  searchQuery?: string;
}

function getDateRangeStart(range: DateRangeFilter): Date | null {
  const now = new Date();
  switch (range) {
    case 'last7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'last30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'thisMonth':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'allTime':
      return null;
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function normalizeSource(source: string): string {
  const sourceMap: Record<string, string> = {
    'phone': 'Phone',
    'voice_call': 'Phone',
    'chat': 'Chat',
    'web_chat': 'Chat',
    'voice_web': 'Voice Web',
    'browser_voice': 'Voice Web',
    'checkout': 'Checkout',
  };
  return sourceMap[source?.toLowerCase()] || source || 'AI Assistant';
}

export function useCustomerLeads(options: UseCustomerLeadsOptions = {}) {
  const { dateRange = 'last30days', source = 'all', searchQuery = '' } = options;

  return useQuery({
    queryKey: ['customer-leads', dateRange, source, searchQuery],
    queryFn: async (): Promise<CustomerLead[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return [];

      // Build query for usage_logs with lead_captured events
      let query = supabase
        .from('usage_logs')
        .select('id, created_at, metadata')
        .eq('customer_id', profile.id)
        .eq('interaction_type', 'lead_captured')
        .order('created_at', { ascending: false });

      // Apply date range filter
      const startDate = getDateRangeStart(dateRange);
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: leadLogs, error } = await query;

      if (error || !leadLogs) return [];

      // Parse lead data from metadata and apply filters
      let leads: CustomerLead[] = leadLogs.map(log => {
        const meta = (log.metadata || {}) as Record<string, unknown>;
        return {
          id: log.id,
          created_at: log.created_at,
          first_name: (meta.first_name as string) || 'Unknown',
          last_name: (meta.last_name as string) || '',
          phone: (meta.phone as string) || null,
          email: (meta.email as string) || null,
          source: normalizeSource((meta.source as string) || ''),
          message: (meta.message as string) || null,
          notes: (meta.notes as string) || null,
          pipeline_status: (meta.pipeline_status as string) || 'new_lead',
        };
      });

      // Apply source filter (client-side since source is in metadata)
      if (source !== 'all') {
        const sourceMap: Record<SourceFilter, string[]> = {
          all: [],
          phone: ['Phone'],
          chat: ['Chat'],
          voice_web: ['Voice Web'],
          checkout: ['Checkout'],
        };
        const allowedSources = sourceMap[source];
        leads = leads.filter(lead => allowedSources.includes(lead.source));
      }

      // Apply search filter (client-side)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        leads = leads.filter(lead => {
          const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
          const email = (lead.email || '').toLowerCase();
          const phone = (lead.phone || '').toLowerCase();
          return fullName.includes(query) || email.includes(query) || phone.includes(query);
        });
      }

      return leads;
    },
  });
}

export function useCustomerLead(leadId: string | null) {
  return useQuery({
    queryKey: ['customer-lead', leadId],
    queryFn: async (): Promise<CustomerLead | null> => {
      if (!leadId) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return null;

      const { data: log, error } = await supabase
        .from('usage_logs')
        .select('id, created_at, metadata, customer_id')
        .eq('id', leadId)
        .eq('customer_id', profile.id)
        .eq('interaction_type', 'lead_captured')
        .maybeSingle();

      if (error || !log) return null;

      const meta = (log.metadata || {}) as Record<string, unknown>;
      return {
        id: log.id,
        created_at: log.created_at,
        first_name: (meta.first_name as string) || 'Unknown',
        last_name: (meta.last_name as string) || '',
        phone: (meta.phone as string) || null,
        email: (meta.email as string) || null,
        source: normalizeSource((meta.source as string) || ''),
        message: (meta.message as string) || null,
        notes: (meta.notes as string) || null,
        pipeline_status: (meta.pipeline_status as string) || 'new_lead',
      };
    },
    enabled: !!leadId,
  });
}
