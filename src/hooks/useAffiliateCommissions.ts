import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { useUserRole } from './useUserRole';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type CommissionStatus = 'pending' | 'paid' | 'all';
export type DateRange = 'this_month' | 'last_month' | 'last_3_months' | 'all_time';

export interface CustomerInfo {
  id: string;
  businessName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  planName: string | null;
  createdAt: Date | null;
}

export interface CommissionRow {
  id: string;
  affiliateId: string;
  customerId: string;
  customer: CustomerInfo | null;
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
 * Now includes customer details (business_name, contact_name, phone, plan_name)
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
        .select(`
          *,
          customer_profiles!affiliate_commissions_customer_id_fkey (
            id,
            business_name,
            contact_name,
            phone,
            plan_name,
            created_at
          )
        `)
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

      return data.map((row: any): CommissionRow => ({
        id: row.id,
        affiliateId: row.affiliate_id,
        customerId: row.customer_id,
        customer: row.customer_profiles ? {
          id: row.customer_profiles.id,
          businessName: row.customer_profiles.business_name,
          contactName: row.customer_profiles.contact_name,
          phone: row.customer_profiles.phone,
          email: null, // Not in customer_profiles, can add later if needed
          planName: row.customer_profiles.plan_name,
          createdAt: row.customer_profiles.created_at ? new Date(row.customer_profiles.created_at) : null,
        } : null,
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
      let recurringMonthlyTotal = 0;

      const byLevel = {
        level1: { pending: 0, paid: 0, total: 0 },
        level2: { pending: 0, paid: 0, total: 0 },
        level3: { pending: 0, paid: 0, total: 0 },
      };

      // Track unique customers to calculate recurring commissions
      const uniqueCustomersThisMonth = new Set<string>();

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
          if (row.status === 'pending') {
            pendingThisMonth += amount;
          } else if (row.status === 'paid') {
            paidThisMonth += amount;
          }
          
          // Track unique customers for recurring calculation
          uniqueCustomersThisMonth.add(row.customer_id);
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

      // Calculate recurring monthly commissions based on customer plans
      // Fetch customer plans to get monthly recurring amount
      if (uniqueCustomersThisMonth.size > 0) {
        const { data: customerPlans } = await supabase
          .from('customer_profiles')
          .select(`
            id,
            customer_plans (
              monthly_price
            )
          `)
          .in('id', Array.from(uniqueCustomersThisMonth));

        // Get commission rate for level 1 (personal sales)
        const { data: commissionPlan } = await supabase
          .from('commission_plans')
          .select('level1_rate')
          .eq('is_default', true)
          .single();

        const level1Rate = commissionPlan?.level1_rate || 0.30;

        // Calculate recurring monthly commissions (monthly_price * commission_rate)
        for (const customer of customerPlans || []) {
          const planData = customer.customer_plans as unknown;
          const plan = Array.isArray(planData) ? planData[0] : planData;
          const monthlyPrice = (plan as { monthly_price: number } | null)?.monthly_price || 0;
          recurringMonthlyTotal += monthlyPrice * level1Rate;
        }
      }

      // Projected annual = recurring monthly commissions × 12
      // Only count recurring (monthly) portion, not one-time setup fees
      const projectedAnnual = recurringMonthlyTotal * 12;

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
        .select(`
          *,
          affiliates(username),
          customer_profiles!affiliate_commissions_customer_id_fkey (
            id,
            business_name,
            contact_name,
            phone,
            plan_name,
            created_at
          )
        `)
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

      return data.map((row: any): CommissionRow & { affiliateUsername: string } => ({
        id: row.id,
        affiliateId: row.affiliate_id,
        affiliateUsername: row.affiliates?.username || 'Unknown',
        customerId: row.customer_id,
        customer: row.customer_profiles ? {
          id: row.customer_profiles.id,
          businessName: row.customer_profiles.business_name,
          contactName: row.customer_profiles.contact_name,
          phone: row.customer_profiles.phone,
          email: null,
          planName: row.customer_profiles.plan_name,
          createdAt: row.customer_profiles.created_at ? new Date(row.customer_profiles.created_at) : null,
        } : null,
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
