import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

interface LeadPresenceData {
  isActive: boolean;
  lastSeenAt: Date | null;
}

export function useLeadPresence(leadId: string): LeadPresenceData & { isLoading: boolean } {
  const [isActive, setIsActive] = useState(false);

  // Fetch initial presence data
  const { data, isLoading } = useQuery({
    queryKey: ['lead-presence', leadId],
    queryFn: async () => {
      // Check lead_presence table
      const { data: presenceData } = await supabase
        .from('lead_presence')
        .select('last_seen_at')
        .eq('lead_id', leadId)
        .maybeSingle();

      // Also check recent demo_views as a fallback
      const twoMinutesAgo = new Date(Date.now() - ACTIVE_THRESHOLD_MS).toISOString();
      const { data: recentView } = await supabase
        .from('demo_views')
        .select('updated_at')
        .eq('lead_id', leadId)
        .gte('updated_at', twoMinutesAgo)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const presenceTime = presenceData?.last_seen_at ? new Date(presenceData.last_seen_at) : null;
      const viewTime = recentView?.updated_at ? new Date(recentView.updated_at) : null;

      // Use the most recent timestamp
      let lastSeenAt: Date | null = null;
      if (presenceTime && viewTime) {
        lastSeenAt = presenceTime > viewTime ? presenceTime : viewTime;
      } else {
        lastSeenAt = presenceTime || viewTime;
      }

      return { lastSeenAt };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to realtime updates on lead_presence
  useEffect(() => {
    const channel = supabase
      .channel(`lead-presence-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_presence',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          if (payload.new && 'last_seen_at' in payload.new) {
            const lastSeen = new Date(payload.new.last_seen_at as string);
            const isNowActive = Date.now() - lastSeen.getTime() < ACTIVE_THRESHOLD_MS;
            setIsActive(isNowActive);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  // Calculate if active based on fetched data
  useEffect(() => {
    if (data?.lastSeenAt) {
      const checkActive = () => {
        const isNowActive = Date.now() - data.lastSeenAt!.getTime() < ACTIVE_THRESHOLD_MS;
        setIsActive(isNowActive);
      };
      
      checkActive();
      // Re-check every 10 seconds to update stale status
      const interval = setInterval(checkActive, 10000);
      return () => clearInterval(interval);
    } else {
      setIsActive(false);
    }
  }, [data?.lastSeenAt]);

  return {
    isActive,
    lastSeenAt: data?.lastSeenAt || null,
    isLoading,
  };
}
