import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export interface PreCallNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: string;
}

export interface PreCallActivity {
  id: string;
  type: string;
  summary: string;
  eventAt: string;
}

export interface PreCallDemoStatus {
  demoId: string;
  businessName: string;
  sent: boolean;
  sentAt?: string;
  viewed: boolean;
  viewedAt?: string;
  progressPercent?: number;
  watchDurationSeconds?: number;
}

export interface PreCallFollowUp {
  id: string;
  reason: string;
  suggestionText: string;
  urgency: number;
}

export interface PreCallSummaryData {
  notes: PreCallNote[];
  activities: PreCallActivity[];
  demoStatus: PreCallDemoStatus | null;
  followUps: PreCallFollowUp[];
  isLoading: boolean;
}

export function usePreCallSummary(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  // Fetch recent notes
  const notesQuery = useQuery({
    queryKey: ['pre-call-notes', leadId],
    queryFn: async (): Promise<PreCallNote[]> => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select('id, content, created_at')
        .eq('related_to_type', 'lead')
        .eq('related_to_id', leadId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data || []).map(n => ({
        id: n.id,
        content: n.content,
        createdAt: n.created_at,
      }));
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 30000,
  });

  // Fetch recent activities from timeline
  const activitiesQuery = useQuery({
    queryKey: ['pre-call-activities', leadId],
    queryFn: async (): Promise<PreCallActivity[]> => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_timeline')
        .select('id, event_type, summary, event_at')
        .eq('lead_id', leadId)
        .in('event_type', ['call', 'voice_call', 'demo_view', 'demo_watched', 'email', 'meeting'])
        .order('event_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data || []).map(a => ({
        id: a.id,
        type: a.event_type,
        summary: a.summary,
        eventAt: a.event_at,
      }));
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 30000,
  });

  // Fetch demo status
  const demoQuery = useQuery({
    queryKey: ['pre-call-demo', leadId],
    queryFn: async (): Promise<PreCallDemoStatus | null> => {
      if (!leadId) return null;
      
      // Get the most recent demo for this lead
      const { data: demo, error: demoError } = await supabase
        .from('demos')
        .select('id, business_name, email_sent_at, first_viewed_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (demoError) throw demoError;
      if (!demo) return null;

      // Get view progress if viewed
      let progressPercent: number | undefined;
      let watchDurationSeconds: number | undefined;
      
      if (demo.first_viewed_at) {
        const { data: views } = await supabase
          .from('demo_views')
          .select('progress_percent, watch_duration_seconds')
          .eq('demo_id', demo.id)
          .eq('lead_id', leadId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (views) {
          progressPercent = views.progress_percent ?? undefined;
          watchDurationSeconds = views.watch_duration_seconds ?? undefined;
        }
      }

      return {
        demoId: demo.id,
        businessName: demo.business_name,
        sent: !!demo.email_sent_at,
        sentAt: demo.email_sent_at ?? undefined,
        viewed: !!demo.first_viewed_at,
        viewedAt: demo.first_viewed_at ?? undefined,
        progressPercent,
        watchDurationSeconds,
      };
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 30000,
  });

  // Fetch follow-up suggestions for this specific lead
  const followUpsQuery = useQuery({
    queryKey: ['pre-call-followups', leadId],
    queryFn: async (): Promise<PreCallFollowUp[]> => {
      if (!leadId) return [];
      
      // Check for demo-related follow-ups
      const followUps: PreCallFollowUp[] = [];
      
      const { data: demo } = await supabase
        .from('demos')
        .select('id, email_sent_at, first_viewed_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (demo) {
        const now = new Date();
        const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const hours24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Demo sent but not viewed after 48h
        if (demo.email_sent_at && !demo.first_viewed_at) {
          const sentAt = new Date(demo.email_sent_at);
          if (sentAt < hours48Ago) {
            followUps.push({
              id: `demo-not-viewed-${demo.id}`,
              reason: 'Demo not viewed (48h)',
              suggestionText: 'Follow up to confirm they saw the demo',
              urgency: 3,
            });
          }
        }
        
        // Demo viewed but no reply after 24h
        if (demo.first_viewed_at) {
          const viewedAt = new Date(demo.first_viewed_at);
          if (viewedAt < hours24Ago) {
            // Check for recent activity
            const { data: recentActivity } = await supabase
              .from('activities')
              .select('id')
              .eq('related_to_type', 'lead')
              .eq('related_to_id', leadId)
              .gte('created_at', demo.first_viewed_at)
              .limit(1);
            
            if (!recentActivity || recentActivity.length === 0) {
              followUps.push({
                id: `demo-no-reply-${demo.id}`,
                reason: 'Demo viewed, no reply (24h)',
                suggestionText: 'Reach out to answer questions',
                urgency: 2,
              });
            }
          }
        }
      }
      
      return followUps;
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 60000,
  });

  return {
    notes: notesQuery.data || [],
    activities: activitiesQuery.data || [],
    demoStatus: demoQuery.data,
    followUps: followUpsQuery.data || [],
    isLoading: notesQuery.isLoading || activitiesQuery.isLoading || demoQuery.isLoading || followUpsQuery.isLoading,
  };
}
