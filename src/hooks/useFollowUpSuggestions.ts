import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays, isAfter } from 'date-fns';

export type SuggestionReason = 
  | 'demo_not_viewed'
  | 'demo_viewed_no_reply'
  | 'lead_inactive';

export interface FollowUpSuggestion {
  id: string;
  leadId: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  demoId?: string;
  reason: SuggestionReason;
  reasonLabel: string;
  suggestionText: string;
  urgency: number; // Higher = more urgent, used for sorting
  timestamp: Date;
}

export function useFollowUpSuggestions() {
  return useQuery({
    queryKey: ['follow-up-suggestions'],
    queryFn: async (): Promise<FollowUpSuggestion[]> => {
      const suggestions: FollowUpSuggestion[] = [];
      const now = new Date();
      const hours48Ago = subHours(now, 48);
      const hours24Ago = subHours(now, 24);
      const days7Ago = subDays(now, 7);

      // 1. Fetch demos with their lead info
      const { data: demos } = await supabase
        .from('demos')
        .select(`
          id,
          lead_id,
          business_name,
          status,
          email_sent_at,
          first_viewed_at,
          last_viewed_at,
          created_at,
          leads (
            id,
            first_name,
            last_name,
            company,
            email,
            phone
          )
        `)
        .not('lead_id', 'is', null);

      // 2. Fetch all leads for inactive check
      const { data: allLeads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, company, email, phone, created_at, updated_at')
        .order('created_at', { ascending: false });

      // 3. Fetch recent activities to check for replies/engagement
      const { data: recentActivities } = await supabase
        .from('activities')
        .select('id, related_to_id, related_to_type, type, created_at')
        .eq('related_to_type', 'lead')
        .gte('created_at', days7Ago.toISOString());

      // Build a map of lead_id -> latest activity date
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
        if (!demo.lead_id || !demo.leads) return;
        
        const emailSentAt = demo.email_sent_at ? new Date(demo.email_sent_at) : null;
        const firstViewedAt = demo.first_viewed_at ? new Date(demo.first_viewed_at) : null;
        
        // Demo was sent but not viewed, and it's been more than 48 hours
        if (emailSentAt && !firstViewedAt && isAfter(hours48Ago, emailSentAt)) {
          const lead = demo.leads as { id: string; first_name: string; last_name: string; company?: string; email?: string; phone?: string };
          suggestions.push({
            id: `demo-not-viewed-${demo.id}`,
            leadId: demo.lead_id,
            name: `${lead.first_name} ${lead.last_name}`,
            company: lead.company || demo.business_name,
            email: lead.email,
            phone: lead.phone,
            demoId: demo.id,
            reason: 'demo_not_viewed',
            reasonLabel: 'Demo not viewed (48h)',
            suggestionText: 'Follow up to confirm they saw the demo',
            urgency: 3, // High urgency
            timestamp: emailSentAt,
          });
        }
      });

      // Rule 2: Demo Viewed – No Reply (24h)
      demos?.forEach(demo => {
        if (!demo.lead_id || !demo.leads) return;
        
        const firstViewedAt = demo.first_viewed_at ? new Date(demo.first_viewed_at) : null;
        
        if (firstViewedAt && isAfter(hours24Ago, firstViewedAt)) {
          // Check if there's been any activity after the view
          const lastActivity = leadActivityMap.get(demo.lead_id);
          const hasRecentActivity = lastActivity && isAfter(lastActivity, firstViewedAt);
          
          if (!hasRecentActivity) {
            const lead = demo.leads as { id: string; first_name: string; last_name: string; company?: string; email?: string; phone?: string };
            // Don't add if already suggested for not-viewed
            const alreadySuggested = suggestions.some(s => s.leadId === demo.lead_id);
            if (!alreadySuggested) {
              suggestions.push({
                id: `demo-no-reply-${demo.id}`,
                leadId: demo.lead_id,
                name: `${lead.first_name} ${lead.last_name}`,
                company: lead.company || demo.business_name,
                email: lead.email,
                phone: lead.phone,
                demoId: demo.id,
                reason: 'demo_viewed_no_reply',
                reasonLabel: 'Demo viewed, no reply (24h)',
                suggestionText: 'Reach out to answer questions after demo view',
                urgency: 2, // Medium urgency
                timestamp: firstViewedAt,
              });
            }
          }
        }
      });

      // Rule 3: Lead Inactive (7 days)
      // Get leads that have demos (to check if they're already covered)
      const leadsWithDemos = new Set(demos?.map(d => d.lead_id).filter(Boolean) || []);
      const suggestedLeadIds = new Set(suggestions.map(s => s.leadId));

      allLeads?.forEach(lead => {
        // Skip if already suggested
        if (suggestedLeadIds.has(lead.id)) return;
        
        const lastActivity = leadActivityMap.get(lead.id);
        const leadCreatedAt = new Date(lead.created_at);
        const leadUpdatedAt = new Date(lead.updated_at);
        
        // Lead must be older than 7 days and have no recent activity
        const isOldEnough = isAfter(days7Ago, leadCreatedAt);
        const hasNoRecentActivity = !lastActivity || isAfter(days7Ago, lastActivity);
        const noRecentUpdate = isAfter(days7Ago, leadUpdatedAt);
        
        if (isOldEnough && hasNoRecentActivity && noRecentUpdate) {
          suggestions.push({
            id: `lead-inactive-${lead.id}`,
            leadId: lead.id,
            name: `${lead.first_name} ${lead.last_name}`,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            reason: 'lead_inactive',
            reasonLabel: 'No activity (7 days)',
            suggestionText: 'Re-engage inactive lead',
            urgency: 1, // Lower urgency
            timestamp: lastActivity || leadUpdatedAt,
          });
        }
      });

      // Sort by urgency (descending) then by timestamp (oldest first for same urgency)
      suggestions.sort((a, b) => {
        if (b.urgency !== a.urgency) return b.urgency - a.urgency;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      // Return top 5
      return suggestions.slice(0, 5);
    },
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}
