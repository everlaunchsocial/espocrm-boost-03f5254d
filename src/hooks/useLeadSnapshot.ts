import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export interface LeadSnapshotData {
  demoProgress: {
    hasDemo: boolean;
    progressPercent: number | null;
    lastViewedAt: string | null;
  };
  responseHistory: {
    hasRecentReply: boolean;
    hasNoResponse7d: boolean;
    lastTouchAt: string | null;
    lastTouchType: string | null;
  };
}

export function useLeadSnapshot(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['lead-snapshot', leadId],
    queryFn: async (): Promise<LeadSnapshotData> => {
      if (!leadId) {
        return {
          demoProgress: { hasDemo: false, progressPercent: null, lastViewedAt: null },
          responseHistory: { hasRecentReply: false, hasNoResponse7d: true, lastTouchAt: null, lastTouchType: null },
        };
      }

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch latest demo view
      const { data: demoViews } = await supabase
        .from('demo_views')
        .select('progress_percent, created_at, updated_at')
        .eq('lead_id', leadId)
        .order('updated_at', { ascending: false })
        .limit(1);

      // Fetch recent notes (2d)
      const { data: recentNotes } = await supabase
        .from('notes')
        .select('id, created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .gte('created_at', twoDaysAgo.toISOString())
        .limit(1);

      // Fetch recent calls (2d)
      const { data: recentCalls } = await supabase
        .from('call_logs')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', twoDaysAgo.toISOString())
        .limit(1);

      // Fetch any activity in 7d for "no response" check
      const { data: notes7d } = await supabase
        .from('notes')
        .select('id, created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: calls7d } = await supabase
        .from('call_logs')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: activities7d } = await supabase
        .from('activities')
        .select('id, created_at, type')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      // Demo progress
      const latestDemo = demoViews?.[0];
      const demoProgress = {
        hasDemo: !!latestDemo,
        progressPercent: latestDemo?.progress_percent ?? null,
        lastViewedAt: latestDemo?.updated_at ?? null,
      };

      // Response history
      const hasRecentReply = (recentNotes?.length ?? 0) > 0 || (recentCalls?.length ?? 0) > 0;
      const hasAnyActivity7d = (notes7d?.length ?? 0) > 0 || (calls7d?.length ?? 0) > 0 || (activities7d?.length ?? 0) > 0;

      // Find last touch
      const allTouches: { date: Date; type: string }[] = [];
      notes7d?.forEach(n => allTouches.push({ date: new Date(n.created_at), type: 'note' }));
      calls7d?.forEach(c => allTouches.push({ date: new Date(c.created_at), type: 'call' }));
      activities7d?.forEach(a => allTouches.push({ date: new Date(a.created_at), type: a.type }));
      if (latestDemo) {
        allTouches.push({ date: new Date(latestDemo.updated_at), type: 'demo_view' });
      }

      allTouches.sort((a, b) => b.date.getTime() - a.date.getTime());
      const lastTouch = allTouches[0] ?? null;

      return {
        demoProgress,
        responseHistory: {
          hasRecentReply,
          hasNoResponse7d: !hasAnyActivity7d,
          lastTouchAt: lastTouch?.date.toISOString() ?? null,
          lastTouchType: lastTouch?.type ?? null,
        },
      };
    },
    enabled: !!leadId && phase2Enabled,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
