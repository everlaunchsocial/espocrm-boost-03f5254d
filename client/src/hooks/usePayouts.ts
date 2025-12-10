import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useCurrentAffiliate } from './useCurrentAffiliate';

export interface PayoutRow {
  id: string;
  affiliateId: string;
  affiliateUsername?: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date;
  method: string | null;
}

export interface PayoutResult {
  affiliatesPaid: number;
  totalAmount: number;
}

/**
 * Admin-only: fetch all payouts
 */
export function useAllPayouts() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['all-payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payouts')
        .select('*, affiliates(username)')
        .order('paid_at', { ascending: false });

      if (error) throw error;

      return data.map((row: any): PayoutRow => ({
        id: row.id,
        affiliateId: row.affiliate_id,
        affiliateUsername: row.affiliates?.username || 'Unknown',
        amount: Number(row.amount),
        periodStart: new Date(row.period_start),
        periodEnd: new Date(row.period_end),
        paidAt: new Date(row.paid_at),
        method: row.method,
      }));
    },
    enabled: !roleLoading && isAdmin,
  });
}

/**
 * Affiliate's own payouts
 */
export function useAffiliatePayouts() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();

  return useQuery({
    queryKey: ['affiliate-payouts', affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];

      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('paid_at', { ascending: false });

      if (error) throw error;

      return data.map((row): PayoutRow => ({
        id: row.id,
        affiliateId: row.affiliate_id,
        amount: Number(row.amount),
        periodStart: new Date(row.period_start),
        periodEnd: new Date(row.period_end),
        paidAt: new Date(row.paid_at),
        method: row.method,
      }));
    },
    enabled: !affiliateLoading && !!affiliateId,
  });
}

/**
 * Admin-only: generate payouts for a period
 */
export function useGeneratePayouts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodStart, periodEnd }: { periodStart: string; periodEnd: string }): Promise<PayoutResult> => {
      const { data, error } = await supabase.rpc('generate_payouts_for_period', {
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (error) throw error;

      // RPC returns array with single row
      const result = Array.isArray(data) ? data[0] : data;
      return {
        affiliatesPaid: result?.affiliates_paid || 0,
        totalAmount: Number(result?.total_amount) || 0,
      };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['all-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
    },
  });
}
