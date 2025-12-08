import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCustomerBilling } from './useCustomerBilling';

interface ActivityStats {
  phoneCalls: number;
  webChats: number;
  voiceWeb: number;
  leadsCapured: number;
}

interface RecentLead {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  source: string;
}

export function useCustomerDashboardData() {
  const billingQuery = useCurrentCustomerBilling();

  const activityQuery = useQuery({
    queryKey: ['customer-activity-stats', billingQuery.data?.customer_id],
    queryFn: async (): Promise<ActivityStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get customer profile
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('id, billing_cycle_start, billing_cycle_end')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        return { phoneCalls: 0, webChats: 0, voiceWeb: 0, leadsCapured: 0 };
      }

      // Build date filter - use billing cycle or last 30 days
      const startDate = profile.billing_cycle_start 
        ? new Date(profile.billing_cycle_start).toISOString()
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const endDate = profile.billing_cycle_end
        ? new Date(profile.billing_cycle_end).toISOString()
        : new Date().toISOString();

      // Get usage logs for this customer in the billing period
      const { data: usageLogs } = await supabase
        .from('usage_logs')
        .select('interaction_type')
        .eq('customer_id', profile.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Count by interaction type
      const logs = usageLogs || [];
      const phoneCalls = logs.filter(l => l.interaction_type === 'phone' || l.interaction_type === 'voice_call').length;
      const webChats = logs.filter(l => l.interaction_type === 'chat' || l.interaction_type === 'web_chat').length;
      const voiceWeb = logs.filter(l => l.interaction_type === 'voice_web' || l.interaction_type === 'browser_voice').length;
      const leadsCapured = logs.filter(l => l.interaction_type === 'lead_captured').length;

      return { phoneCalls, webChats, voiceWeb, leadsCapured };
    },
    enabled: true,
  });

  // For recent leads - currently leads table is tied to affiliates for CRM purposes
  // Customer-captured leads would be in usage_logs with lead data in metadata
  // For now, we'll show empty state since this is a new feature
  const recentLeadsQuery = useQuery({
    queryKey: ['customer-recent-leads'],
    queryFn: async (): Promise<RecentLead[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return [];

      // Check usage_logs for lead_captured events with metadata
      const { data: leadLogs } = await supabase
        .from('usage_logs')
        .select('id, created_at, metadata')
        .eq('customer_id', profile.id)
        .eq('interaction_type', 'lead_captured')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!leadLogs || leadLogs.length === 0) return [];

      // Parse lead data from metadata
      return leadLogs.map(log => {
        const meta = (log.metadata || {}) as Record<string, unknown>;
        return {
          id: log.id,
          created_at: log.created_at,
          first_name: (meta.first_name as string) || 'Unknown',
          last_name: (meta.last_name as string) || '',
          phone: (meta.phone as string) || null,
          email: (meta.email as string) || null,
          source: (meta.source as string) || 'AI Assistant',
        };
      });
    },
  });

  return {
    billing: billingQuery.data,
    billingLoading: billingQuery.isLoading,
    billingError: billingQuery.error,
    activity: activityQuery.data,
    activityLoading: activityQuery.isLoading,
    recentLeads: recentLeadsQuery.data || [],
    recentLeadsLoading: recentLeadsQuery.isLoading,
    isLoading: billingQuery.isLoading || activityQuery.isLoading || recentLeadsQuery.isLoading,
  };
}
