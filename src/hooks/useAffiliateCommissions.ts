import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { useUserRole } from './useUserRole';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export type CommissionStatus = 'pending' | 'paid' | 'all';
export type DateRange = 'this_month' | 'last_month' | 'last_3_months' | 'all_time';

export interface CommissionRow {
  id: string;
  affiliateId: string;
  customerId: string;
  amount: number;
  commissionLevel: number;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
}

export interface CommissionSummary {
  pendingThisMonth: number;
  paidThisMonth: number;
  lifetimeEarned: number;
  projectedAnnual: number;
  byLevel: {
    level1: { pending: number; paid: number; total: number };
    level2: { pending: number; paid: number; total: number };
    level3: { pending: number; paid: number; total: number };
  };
}

function getDateRange(range: DateRange): { start: Date | null; end: Date | null } {
  const now = new Date();
  
  switch (range) {
    case 'this_month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    case 'last_3_months':
      return {
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(now),
      };
    case 'all_time':
    default:
      return { start: null, end: null };
  }
}

/**
 * Fetch commissions for the current affiliate with filters
 */
export function useAffiliateCommissions(
  statusFilter: CommissionStatus = 'all',
  dateRange: DateRange = 'this_month'
) {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['affiliate-commissions', affiliateId, statusFilter, dateRange],
    queryFn: async () => {
      if (!affiliateId) return [];

      const { start, end } = getDateRange(dateRange);

      let query = supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date range filter
      if (start) {
        query = query.gte('created_at', start.toISOString());
      }
      if (end) {
        query = query.lte('created_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((row): CommissionRow => ({
        id: row.id,
        affiliateId: row.affiliate_id,
        customerId: row.customer_id,
        amount: Number(row.amount),
        commissionLevel: row.commission_level,
        status: row.status,
        createdAt: new Date(row.created_at),
        paidAt: row.paid_at ? new Date(row.paid_at) : null,
      }));
    },
    enabled: !affiliateLoading && !roleLoading && !!affiliateId,
  });
}

/**
 * Fetch commission summary/aggregates for the current affiliate
 */
export function useCommissionSummary() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();

  return useQuery({
    queryKey: ['commission-summary', affiliateId],
    queryFn: async (): Promise<CommissionSummary> => {
      if (!affiliateId) {
        return {
          pendingThisMonth: 0,
          paidThisMonth: 0,
          lifetimeEarned: 0,
          projectedAnnual: 0,
          byLevel: {
            level1: { pending: 0, paid: 0, total: 0 },
            level2: { pending: 0, paid: 0, total: 0 },
            level3: { pending: 0, paid: 0, total: 0 },
          },
        };
      }

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Fetch all commissions for the affiliate
      const { data: allCommissions, error } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliateId);

      if (error) throw error;

      // Calculate aggregates
      let pendingThisMonth = 0;
      let paidThisMonth = 0;
      let lifetimeEarned = 0;
      let thisMonthTotal = 0;

      const byLevel = {
        level1: { pending: 0, paid: 0, total: 0 },
        level2: { pending: 0, paid: 0, total: 0 },
        level3: { pending: 0, paid: 0, total: 0 },
      };

      for (const row of allCommissions || []) {
        const amount = Number(row.amount);
        const createdAt = new Date(row.created_at);
        const isThisMonth = createdAt >= new Date(monthStart) && createdAt <= new Date(monthEnd);
        const levelKey = `level${row.commission_level}` as 'level1' | 'level2' | 'level3';

        // Lifetime earned (all paid)
        if (row.status === 'paid') {
          lifetimeEarned += amount;
        }

        // This month calculations
        if (isThisMonth) {
          thisMonthTotal += amount;
          if (row.status === 'pending') {
            pendingThisMonth += amount;
          } else if (row.status === 'paid') {
            paidThisMonth += amount;
          }
        }

        // By level breakdown (this month for simplicity)
        if (isThisMonth && byLevel[levelKey]) {
          byLevel[levelKey].total += amount;
          if (row.status === 'pending') {
            byLevel[levelKey].pending += amount;
          } else if (row.status === 'paid') {
            byLevel[levelKey].paid += amount;
          }
        }
      }

      // Projected annual (simple: this month * 12)
      const projectedAnnual = thisMonthTotal * 12;

      return {
        pendingThisMonth,
        paidThisMonth,
        lifetimeEarned,
        projectedAnnual,
        byLevel,
      };
    },
    enabled: !affiliateLoading && !!affiliateId,
  });
}

/**
 * Admin-only: fetch all commissions across all affiliates
 */
export function useAllCommissions(
  statusFilter: CommissionStatus = 'all',
  dateRange: DateRange = 'this_month'
) {
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['all-commissions', statusFilter, dateRange],
    queryFn: async () => {
      const { start, end } = getDateRange(dateRange);

      let query = supabase
        .from('affiliate_commissions')
        .select('*, affiliates(username)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (start) {
        query = query.gte('created_at', start.toISOString());
      }
      if (end) {
        query = query.lte('created_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((row: any) => ({
        id: row.id,
        affiliateId: row.affiliate_id,
        affiliateUsername: row.affiliates?.username || 'Unknown',
        customerId: row.customer_id,
        amount: Number(row.amount),
        commissionLevel: row.commission_level,
        status: row.status,
        createdAt: new Date(row.created_at),
        paidAt: row.paid_at ? new Date(row.paid_at) : null,
      }));
    },
    enabled: !roleLoading && isAdmin,
  });
}
