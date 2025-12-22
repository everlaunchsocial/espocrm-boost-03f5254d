import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays, isAfter } from 'date-fns';

/**
 * Returns a set of lead IDs that have unresolved AI-suggested follow-ups.
 * Uses the same logic as useFollowUpSuggestions but returns just the IDs.
 */
export function useLeadsNeedingFollowUp() {
  return useQuery({
    queryKey: ['leads-needing-followup'],
    queryFn: async (): Promise<Set<string>> => {
      const leadIds = new Set<string>();
      const now = new Date();
      const hours48Ago = subHours(now, 48);
      const hours24Ago = subHours(now, 24);
      const days7Ago = subDays(now, 7);

      // Fetch demos with their lead info
      const { data: demos } = await supabase
        .from('demos')
        .select(`
          id,
          lead_id,
          email_sent_at,
          first_viewed_at
        `)
        .not('lead_id', 'is', null);

      // Fetch all leads for inactive check
      const { data: allLeads } = await supabase
        .from('leads')
        .select('id, created_at, updated_at');

      // Fetch recent activities
      const { data: recentActivities } = await supabase
        .from('activities')
        .select('id, related_to_id, related_to_type, created_at')
        .eq('related_to_type', 'lead')
        .gte('created_at', days7Ago.toISOString());

      // Build activity map
      const leadActivityMap = new Map<string, Date>();
      recentActivities?.forEach(activity => {
        if (activity.related_to_id) {
          const existing = leadActivityMap.get(activity.related_to_id);
          const activityDate = new Date(activity.created_at);
          if (!existing || activityDate > existing) {
            leadActivityMap.set(activity.related_to_id, activityDate);
          }
        }
      });

      // Rule 1: Demo Sent – Not Viewed (48h)
      demos?.forEach(demo => {
        if (!demo.lead_id) return;
        const emailSentAt = demo.email_sent_at ? new Date(demo.email_sent_at) : null;
        const firstViewedAt = demo.first_viewed_at ? new Date(demo.first_viewed_at) : null;
        
        if (emailSentAt && !firstViewedAt && isAfter(hours48Ago, emailSentAt)) {
          leadIds.add(demo.lead_id);
        }
      });

      // Rule 2: Demo Viewed – No Reply (24h)
      demos?.forEach(demo => {
        if (!demo.lead_id || leadIds.has(demo.lead_id)) return;
        const firstViewedAt = demo.first_viewed_at ? new Date(demo.first_viewed_at) : null;
        
        if (firstViewedAt && isAfter(hours24Ago, firstViewedAt)) {
          const lastActivity = leadActivityMap.get(demo.lead_id);
          const hasRecentActivity = lastActivity && isAfter(lastActivity, firstViewedAt);
          if (!hasRecentActivity) {
            leadIds.add(demo.lead_id);
          }
        }
      });

      // Rule 3: Lead Inactive (7 days)
      allLeads?.forEach(lead => {
        if (leadIds.has(lead.id)) return;
        
        const lastActivity = leadActivityMap.get(lead.id);
        const leadCreatedAt = new Date(lead.created_at);
        const leadUpdatedAt = new Date(lead.updated_at);
        
        const isOldEnough = isAfter(days7Ago, leadCreatedAt);
        const hasNoRecentActivity = !lastActivity || isAfter(days7Ago, lastActivity);
        const noRecentUpdate = isAfter(days7Ago, leadUpdatedAt);
        
        if (isOldEnough && hasNoRecentActivity && noRecentUpdate) {
          leadIds.add(lead.id);
        }
      });

      return leadIds;
    },
    refetchInterval: 120000,
  });
}

/**
 * Returns a set of lead IDs that have recent activity (last 48 hours)
 * indicating they have fresh data available for AI summaries.
 */
export function useLeadsWithRecentActivity() {
  return useQuery({
    queryKey: ['leads-with-recent-activity'],
    queryFn: async (): Promise<Set<string>> => {
      const leadIds = new Set<string>();
      const hours48Ago = subHours(new Date(), 48);

      // Check for recent activities
      const { data: recentActivities } = await supabase
        .from('activities')
        .select('related_to_id')
        .eq('related_to_type', 'lead')
        .gte('created_at', hours48Ago.toISOString());

      recentActivities?.forEach(a => {
        if (a.related_to_id) leadIds.add(a.related_to_id);
      });

      // Check for recent notes
      const { data: recentNotes } = await supabase
        .from('notes')
        .select('related_to_id')
        .eq('related_to_type', 'lead')
        .gte('created_at', hours48Ago.toISOString());

      recentNotes?.forEach(n => {
        if (n.related_to_id) leadIds.add(n.related_to_id);
      });

      // Check for recent demo views
      const { data: recentDemoViews } = await supabase
        .from('demo_views')
        .select('lead_id')
        .gte('created_at', hours48Ago.toISOString());

      recentDemoViews?.forEach(d => {
        if (d.lead_id) leadIds.add(d.lead_id);
      });

      // Check for recent call logs
      const { data: recentCalls } = await supabase
        .from('call_logs')
        .select('lead_id')
        .gte('created_at', hours48Ago.toISOString());

      recentCalls?.forEach(c => {
        if (c.lead_id) leadIds.add(c.lead_id);
      });

      return leadIds;
    },
    refetchInterval: 120000,
  });
}
