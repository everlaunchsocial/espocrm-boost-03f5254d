import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';
import { subDays } from 'date-fns';

export interface MessagePerformanceStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  demoClickRate: number;
  totalOpens: number;
  totalClicks: number;
  totalDemoClicks: number;
  emailsSent: number;
}

export function useMessagePerformance(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['message-performance', leadId],
    queryFn: async (): Promise<MessagePerformanceStats | null> => {
      if (!leadId) return null;

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Fetch emails sent to this lead in the past 30 days
      const { data: emails, error: emailsError } = await supabase
        .from('emails')
        .select('id, open_count, sent_at')
        .eq('lead_id', leadId)
        .gte('sent_at', thirtyDaysAgo);

      if (emailsError) throw emailsError;

      const emailsSent = emails?.length || 0;

      // Fetch email events (opens and clicks) for this lead
      const { data: events, error: eventsError } = await supabase
        .from('email_events')
        .select('event_type, url, created_at')
        .eq('lead_id', leadId)
        .gte('created_at', thirtyDaysAgo);

      if (eventsError) throw eventsError;

      const allEvents = events || [];
      const opens = allEvents.filter(e => e.event_type === 'open');
      const clicks = allEvents.filter(e => e.event_type === 'click');
      
      // Demo clicks are clicks that contain 'demo' in the URL
      const demoClicks = clicks.filter(e => 
        e.url && e.url.toLowerCase().includes('demo')
      );

      // Calculate rates
      const openRate = emailsSent > 0 ? (opens.length > 0 ? Math.min(100, (opens.length / emailsSent) * 100) : 0) : 0;
      const clickRate = emailsSent > 0 ? (clicks.length > 0 ? Math.min(100, (clicks.length / emailsSent) * 100) : 0) : 0;
      const demoClickRate = emailsSent > 0 ? (demoClicks.length > 0 ? Math.min(100, (demoClicks.length / emailsSent) * 100) : 0) : 0;

      return {
        totalSent: emailsSent,
        emailsSent,
        openRate: Math.round(openRate),
        clickRate: Math.round(clickRate),
        demoClickRate: Math.round(demoClickRate),
        totalOpens: opens.length,
        totalClicks: clicks.length,
        totalDemoClicks: demoClicks.length,
      };
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 30000,
  });
}
