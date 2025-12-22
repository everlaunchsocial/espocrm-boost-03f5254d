import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export type PredictedStatus = 'hot' | 'warm' | 'cold';

export interface LeadStatusPrediction {
  status: PredictedStatus;
  reason: string;
}

export function useLeadStatusPrediction(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['lead-status-prediction', leadId],
    queryFn: async (): Promise<LeadStatusPrediction> => {
      if (!leadId) {
        return { status: 'cold', reason: 'No lead data' };
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch demo views in last 24h
      const { data: recentDemoViews } = await supabase
        .from('demo_views')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', oneDayAgo.toISOString())
        .limit(1);

      // Fetch demo views in last 7d
      const { data: weekDemoViews } = await supabase
        .from('demo_views')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1);

      // Fetch notes in last 48h
      const { data: recentNotes } = await supabase
        .from('notes')
        .select('id, created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .gte('created_at', twoDaysAgo.toISOString())
        .limit(1);

      // Fetch call logs in last 48h
      const { data: recentCalls } = await supabase
        .from('call_logs')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', twoDaysAgo.toISOString())
        .limit(1);

      // Fetch notes in last 7d
      const { data: weekNotes } = await supabase
        .from('notes')
        .select('id, created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1);

      // Fetch call logs in last 7d
      const { data: weekCalls } = await supabase
        .from('call_logs')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1);

      const hasDemoViewedLast24h = (recentDemoViews?.length ?? 0) > 0;
      const hasResponseLast48h = (recentNotes?.length ?? 0) > 0 || (recentCalls?.length ?? 0) > 0;
      const hasDemoViewedLast7d = (weekDemoViews?.length ?? 0) > 0;
      const hasActivityLast7d = (weekNotes?.length ?? 0) > 0 || (weekCalls?.length ?? 0) > 0;

      // Hot: Demo viewed in last 24h AND any response in last 48h
      if (hasDemoViewedLast24h && hasResponseLast48h) {
        return { status: 'hot', reason: 'Demo viewed recently with active engagement' };
      }

      // Warm: Demo viewed OR note/call in last 7d
      if (hasDemoViewedLast7d || hasActivityLast7d) {
        return { status: 'warm', reason: 'Recent activity in last 7 days' };
      }

      // Cold: No activity in past 7d
      return { status: 'cold', reason: 'No activity in past 7 days' };
    },
    enabled: !!leadId && phase2Enabled,
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    staleTime: 30000,
  });
}
