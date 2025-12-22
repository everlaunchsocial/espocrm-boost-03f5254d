import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export interface EmailEvent {
  id: string;
  lead_id: string | null;
  email_id: string | null;
  event_type: 'open' | 'click';
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface EmailEventWithEmail extends EmailEvent {
  email?: {
    subject: string;
    to_email: string;
  };
}

export function useLeadEmailEvents(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['lead-email-events', leadId],
    queryFn: async (): Promise<EmailEventWithEmail[]> => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('email_events')
        .select(`
          *,
          email:emails!email_id(subject, to_email)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EmailEventWithEmail[];
    },
    enabled: !!leadId && phase2Enabled,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useEmailEngagementStats(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['lead-email-engagement-stats', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from('email_events')
        .select('event_type, created_at')
        .eq('lead_id', leadId);

      if (error) throw error;
      
      const events = data || [];
      const opens = events.filter(e => e.event_type === 'open').length;
      const clicks = events.filter(e => e.event_type === 'click').length;
      const uniqueOpens = new Set(events.filter(e => e.event_type === 'open').map(e => e.created_at.substring(0, 10))).size;
      
      return {
        totalOpens: opens,
        totalClicks: clicks,
        uniqueOpens,
        isHighEngagement: opens >= 2 && clicks >= 1,
        isEngaged: opens >= 1,
      };
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 30000,
  });
}
