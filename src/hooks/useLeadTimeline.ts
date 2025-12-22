import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export interface LeadTimelineEvent {
  id: string;
  lead_id: string;
  event_type: 'note' | 'call' | 'email' | 'meeting' | 'voice_call' | 'demo_view' | 'demo_watched' | 'followup' | 'task' | 'status-change' | 'email_open' | 'email_click';
  summary: string;
  preview_content: string | null;
  event_at: string;
  metadata: Record<string, unknown>;
}

export function useLeadTimeline(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: async (): Promise<LeadTimelineEvent[]> => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_timeline')
        .select('*')
        .eq('lead_id', leadId)
        .order('event_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadTimelineEvent[];
    },
    enabled: !!leadId && phase2Enabled,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  });
}
