import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LastSeenData {
  lastSeenAt: Date | null;
  interactionType: string | null;
}

export function useLeadLastSeen(leadId: string) {
  return useQuery({
    queryKey: ['lead-last-seen', leadId],
    queryFn: async (): Promise<LastSeenData> => {
      // Fetch from multiple sources in parallel
      const [demoViewsResult, emailEventsResult, notesResult, callLogsResult] = await Promise.all([
        // Demo views
        supabase
          .from('demo_views')
          .select('created_at')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Email events (opens/clicks) - use created_at and event_type
        supabase
          .from('email_events')
          .select('created_at, event_type')
          .eq('lead_id', leadId)
          .in('event_type', ['open', 'click'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Notes (replies from lead perspective - check for lead-related notes)
        supabase
          .from('notes')
          .select('created_at')
          .eq('related_to_type', 'lead')
          .eq('related_to_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Call logs
        supabase
          .from('call_logs')
          .select('created_at')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Collect all timestamps with their types
      const activities: { date: Date; type: string }[] = [];

      if (demoViewsResult.data?.created_at) {
        activities.push({
          date: new Date(demoViewsResult.data.created_at),
          type: 'Viewed demo',
        });
      }

      if (emailEventsResult.data?.created_at) {
        const eventType = emailEventsResult.data.event_type;
        activities.push({
          date: new Date(emailEventsResult.data.created_at),
          type: eventType === 'click' ? 'Clicked email link' : 'Opened email',
        });
      }

      if (notesResult.data?.created_at) {
        activities.push({
          date: new Date(notesResult.data.created_at),
          type: 'Note added',
        });
      }

      if (callLogsResult.data?.created_at) {
        activities.push({
          date: new Date(callLogsResult.data.created_at),
          type: 'Call logged',
        });
      }

      // Sort by most recent
      activities.sort((a, b) => b.date.getTime() - a.date.getTime());

      if (activities.length === 0) {
        return { lastSeenAt: null, interactionType: null };
      }

      return {
        lastSeenAt: activities[0].date,
        interactionType: activities[0].type,
      };
    },
    enabled: !!leadId,
    staleTime: 60000, // 1 minute
  });
}
