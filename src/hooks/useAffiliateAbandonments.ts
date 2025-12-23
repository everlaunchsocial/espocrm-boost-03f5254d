import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from './useCurrentAffiliate';

export interface Abandonment {
  id: string;
  username: string | null;
  email: string | null;
  plan: string | null;
  step: string | null;
  event_name: string;
  created_at: string;
  viewed_by_affiliate: boolean;
}

export function useAffiliateAbandonments() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const [abandonments, setAbandonments] = useState<Abandonment[]>([]);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAbandonments = useCallback(async () => {
    if (!affiliateId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all signup events for this affiliate's referrals
      const { data: events, error } = await supabase
        .from('signup_events')
        .select('*')
        .eq('referrer_affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching abandonments:', error);
        setIsLoading(false);
        return;
      }

      // Group events by email/username to determine abandonments
      const grouped = new Map<string, typeof events>();
      events?.forEach(event => {
        const key = event.email || event.username || event.id;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(event);
      });

      // Filter to only abandonments (has signup_started or stripe_redirect but no payment_completed)
      const abandonmentList: Abandonment[] = [];
      grouped.forEach((userEvents) => {
        const hasStarted = userEvents.some(e => 
          e.event_name === 'signup_started' || e.event_name === 'stripe_redirect'
        );
        const hasCompleted = userEvents.some(e => 
          e.event_name === 'payment_completed' || e.event_name === 'account_created'
        );

        if (hasStarted && !hasCompleted) {
          // Find the latest event for this user
          const latestEvent = userEvents[0]; // Already sorted by created_at desc
          abandonmentList.push({
            id: latestEvent.id,
            username: latestEvent.username,
            email: latestEvent.email,
            plan: latestEvent.plan,
            step: latestEvent.step,
            event_name: latestEvent.event_name,
            created_at: latestEvent.created_at || '',
            viewed_by_affiliate: latestEvent.viewed_by_affiliate || false,
          });
        }
      });

      setAbandonments(abandonmentList);
      setUnviewedCount(abandonmentList.filter(a => !a.viewed_by_affiliate).length);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [affiliateId]);

  useEffect(() => {
    if (!affiliateLoading && affiliateId) {
      fetchAbandonments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliateId, affiliateLoading]);

  const markAllAsViewed = useCallback(async () => {
    if (!affiliateId) return;

    try {
      // Update all unviewed events for this affiliate
      const { error } = await supabase
        .from('signup_events')
        .update({ viewed_by_affiliate: true })
        .eq('referrer_affiliate_id', affiliateId)
        .eq('viewed_by_affiliate', false);

      if (error) {
        console.error('Error marking as viewed:', error);
        return;
      }

      // Update local state
      setAbandonments(prev => prev.map(a => ({ ...a, viewed_by_affiliate: true })));
      setUnviewedCount(0);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }, [affiliateId]);

  return {
    abandonments,
    unviewedCount,
    isLoading: isLoading || affiliateLoading,
    refetch: fetchAbandonments,
    markAllAsViewed,
  };
}
