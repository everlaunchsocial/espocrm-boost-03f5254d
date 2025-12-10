import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { useUserRole } from './useUserRole';
import { Demo } from './useDemos';

/**
 * Hook to fetch demos filtered by affiliate ownership
 * - Affiliates see only their own demos (by affiliate_id or rep_id)
 * - Admins see all demos
 */
export function useAffiliateDemos() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const { isAdmin, userId, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['affiliate-demos', affiliateId, userId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('demos')
        .select('*')
        .order('created_at', { ascending: false });

      // If user is affiliate (not admin), filter by their affiliate_id or rep_id
      if (!isAdmin && (affiliateId || userId)) {
        if (affiliateId) {
          query = query.eq('affiliate_id', affiliateId);
        } else if (userId) {
          query = query.eq('rep_id', userId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Demo[]) || [];
    },
    enabled: !affiliateLoading && !roleLoading,
  });
}

/**
 * Hook to get demo count for current affiliate
 */
export function useAffiliateDemoCount() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const { isAdmin, userId, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['affiliate-demo-count', affiliateId, userId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('demos')
        .select('id', { count: 'exact', head: true });

      if (!isAdmin && (affiliateId || userId)) {
        if (affiliateId) {
          query = query.eq('affiliate_id', affiliateId);
        } else if (userId) {
          query = query.eq('rep_id', userId);
        }
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !affiliateLoading && !roleLoading,
  });
}

/**
 * Hook to get demos created this week for current affiliate
 */
export function useAffiliateDemosThisWeek() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const { isAdmin, userId, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['affiliate-demos-this-week', affiliateId, userId, isAdmin],
    queryFn: async () => {
      // Calculate start of week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(now.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);

      let query = supabase
        .from('demos')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString());

      if (!isAdmin && (affiliateId || userId)) {
        if (affiliateId) {
          query = query.eq('affiliate_id', affiliateId);
        } else if (userId) {
          query = query.eq('rep_id', userId);
        }
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !affiliateLoading && !roleLoading,
  });
}
