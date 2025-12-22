import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export type EngagementTrend = 'increasing' | 'flat' | 'dropping';

export interface LeadInsightsData {
  interests: string[];
  talkingPoints: { point: string; reason: string }[];
  engagementTrend: EngagementTrend;
  engagementChange: number; // percentage change
  riskWarning: string | null;
  lastActivityDays: number | null;
}

export function useLeadInsights(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  // Fetch AI-generated insights
  const aiInsightsQuery = useQuery({
    queryKey: ['lead-insights-ai', leadId],
    queryFn: async () => {
      if (!leadId) return { interests: [], talkingPoints: [] };

      const { data, error } = await supabase.functions.invoke('generate-lead-insights', {
        body: { leadId }
      });

      if (error) {
        console.error('Error fetching AI insights:', error);
        return { interests: [], talkingPoints: [] };
      }

      return data as { interests: string[]; talkingPoints: { point: string; reason: string }[] };
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
    refetchInterval: 60 * 60 * 1000, // Refetch hourly
  });

  // Calculate engagement trend and risk
  const engagementQuery = useQuery({
    queryKey: ['lead-engagement-trend', leadId],
    queryFn: async (): Promise<{
      trend: EngagementTrend;
      change: number;
      riskWarning: string | null;
      lastActivityDays: number | null;
    }> => {
      if (!leadId) {
        return { trend: 'flat', change: 0, riskWarning: null, lastActivityDays: null };
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Fetch activity counts for both periods
      const [notesRecent, notesOlder, callsRecent, callsOlder, demosRecent, demosOlder, activitiesRecent, activitiesOlder] = await Promise.all([
        // Last 7 days
        supabase.from('notes').select('id', { count: 'exact' })
          .eq('related_to_type', 'lead').eq('related_to_id', leadId)
          .gte('created_at', sevenDaysAgo.toISOString()),
        // 7-14 days ago
        supabase.from('notes').select('id', { count: 'exact' })
          .eq('related_to_type', 'lead').eq('related_to_id', leadId)
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),
        
        supabase.from('call_logs').select('id', { count: 'exact' })
          .eq('lead_id', leadId)
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('call_logs').select('id', { count: 'exact' })
          .eq('lead_id', leadId)
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),

        supabase.from('demo_views').select('id', { count: 'exact' })
          .eq('lead_id', leadId)
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('demo_views').select('id', { count: 'exact' })
          .eq('lead_id', leadId)
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),

        supabase.from('activities').select('id', { count: 'exact' })
          .eq('related_to_type', 'lead').eq('related_to_id', leadId)
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('activities').select('id', { count: 'exact' })
          .eq('related_to_type', 'lead').eq('related_to_id', leadId)
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),
      ]);

      const recentCount = (notesRecent.count ?? 0) + (callsRecent.count ?? 0) + 
                         (demosRecent.count ?? 0) + (activitiesRecent.count ?? 0);
      const olderCount = (notesOlder.count ?? 0) + (callsOlder.count ?? 0) + 
                        (demosOlder.count ?? 0) + (activitiesOlder.count ?? 0);

      // Calculate trend
      let trend: EngagementTrend = 'flat';
      let change = 0;

      if (olderCount > 0) {
        change = ((recentCount - olderCount) / olderCount) * 100;
      } else if (recentCount > 0) {
        change = 100;
      }

      if (change > 20) trend = 'increasing';
      else if (change < -20) trend = 'dropping';

      // Find last activity
      const { data: lastActivity } = await supabase
        .from('activities')
        .select('created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: lastNote } = await supabase
        .from('notes')
        .select('created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: lastCall } = await supabase
        .from('call_logs')
        .select('created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1);

      const dates = [
        lastActivity?.[0]?.created_at,
        lastNote?.[0]?.created_at,
        lastCall?.[0]?.created_at,
      ].filter(Boolean).map(d => new Date(d!));

      let lastActivityDays: number | null = null;
      let riskWarning: string | null = null;

      if (dates.length > 0) {
        const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
        lastActivityDays = Math.floor((now.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000));
        
        if (lastActivityDays >= 14) {
          riskWarning = `Cold Lead — no response in ${lastActivityDays}d`;
        } else if (lastActivityDays >= 7 && recentCount === 0) {
          riskWarning = `At Risk — engagement dropping`;
        }
      } else {
        riskWarning = 'No activity recorded';
        lastActivityDays = null;
      }

      return { trend, change: Math.round(change), riskWarning, lastActivityDays };
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });

  return {
    data: {
      interests: aiInsightsQuery.data?.interests ?? [],
      talkingPoints: aiInsightsQuery.data?.talkingPoints ?? [],
      engagementTrend: engagementQuery.data?.trend ?? 'flat',
      engagementChange: engagementQuery.data?.change ?? 0,
      riskWarning: engagementQuery.data?.riskWarning ?? null,
      lastActivityDays: engagementQuery.data?.lastActivityDays ?? null,
    } as LeadInsightsData,
    isLoading: aiInsightsQuery.isLoading || engagementQuery.isLoading,
    isError: aiInsightsQuery.isError || engagementQuery.isError,
  };
}
