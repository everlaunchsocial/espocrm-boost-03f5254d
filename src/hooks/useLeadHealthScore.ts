import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export type HealthLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface LeadHealthScore {
  score: number;
  level: HealthLevel;
  breakdown: {
    demoViewPenalty: number;
    activityPenalty: number;
    stalePenalty: number;
    replyBonus: number;
    demoViewBonus: number;
  };
}

export function useLeadHealthScore(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['lead-health-score', leadId],
    queryFn: async (): Promise<LeadHealthScore> => {
      if (!leadId) {
        return { 
          score: 0, 
          level: 'poor',
          breakdown: { demoViewPenalty: 0, activityPenalty: 0, stalePenalty: 0, replyBonus: 0, demoViewBonus: 0 }
        };
      }

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch demo views in last 7d
      const { data: demoViews7d } = await supabase
        .from('demo_views')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Fetch notes in last 7d
      const { data: notes7d } = await supabase
        .from('notes')
        .select('id, created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Fetch call logs in last 7d
      const { data: calls7d } = await supabase
        .from('call_logs')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Fetch activities in last 7d
      const { data: activities7d } = await supabase
        .from('activities')
        .select('id, created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Fetch notes/calls in last 2d for reply bonus
      const { data: notes2d } = await supabase
        .from('notes')
        .select('id')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .gte('created_at', twoDaysAgo.toISOString())
        .limit(1);

      const { data: calls2d } = await supabase
        .from('call_logs')
        .select('id')
        .eq('lead_id', leadId)
        .gte('created_at', twoDaysAgo.toISOString())
        .limit(1);

      // Find last touch date
      const allTouchDates: Date[] = [];
      notes7d?.forEach(n => allTouchDates.push(new Date(n.created_at)));
      calls7d?.forEach(c => allTouchDates.push(new Date(c.created_at)));
      activities7d?.forEach(a => allTouchDates.push(new Date(a.created_at)));
      demoViews7d?.forEach(d => allTouchDates.push(new Date(d.created_at)));

      const lastTouch = allTouchDates.length > 0 
        ? new Date(Math.max(...allTouchDates.map(d => d.getTime())))
        : null;

      // Calculate score
      let score = 100;
      const breakdown = {
        demoViewPenalty: 0,
        activityPenalty: 0,
        stalePenalty: 0,
        replyBonus: 0,
        demoViewBonus: 0,
      };

      // Penalties
      if ((demoViews7d?.length ?? 0) === 0) {
        breakdown.demoViewPenalty = -30;
        score -= 30;
      }

      const hasActivity = (notes7d?.length ?? 0) > 0 || (calls7d?.length ?? 0) > 0 || (activities7d?.length ?? 0) > 0;
      if (!hasActivity) {
        breakdown.activityPenalty = -20;
        score -= 20;
      }

      if (!lastTouch || lastTouch < threeDaysAgo) {
        breakdown.stalePenalty = -10;
        score -= 10;
      }

      // Bonuses
      const hasRecentReply = (notes2d?.length ?? 0) > 0 || (calls2d?.length ?? 0) > 0;
      if (hasRecentReply) {
        breakdown.replyBonus = 10;
        score += 10;
      }

      const demoViewCount = demoViews7d?.length ?? 0;
      if (demoViewCount > 0) {
        const bonus = Math.min(demoViewCount * 5, 15);
        breakdown.demoViewBonus = bonus;
        score += bonus;
      }

      // Clamp score
      score = Math.max(0, Math.min(100, score));

      // Determine level
      let level: HealthLevel;
      if (score >= 80) level = 'excellent';
      else if (score >= 60) level = 'good';
      else if (score >= 30) level = 'fair';
      else level = 'poor';

      return { score, level, breakdown };
    },
    enabled: !!leadId && phase2Enabled,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
