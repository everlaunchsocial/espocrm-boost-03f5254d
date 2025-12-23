import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  customerId?: string;
  customerName?: string;
  planName: string;
  planAmount: number;
  billingCycle: string;
  startDate: string;
  nextBillingDate?: string;
  endDate?: string;
  status: string;
  autoRenew: boolean;
  createdAt: string;
}

export interface Commission {
  id: string;
  repId: string;
  repName?: string;
  dealId?: string;
  dealName?: string;
  dealAmount: number;
  commissionRate: number;
  commissionAmount: number;
  commissionType: string;
  status: string;
  paymentDate?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface RevenueTarget {
  id: string;
  targetType: string;
  targetOwnerId?: string;
  ownerName?: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  targetAmount: number;
  currentAmount: number;
  achievementPercentage: number;
}

// Transform functions
function toPayment(row: any): Payment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    transactionId: row.transaction_id,
    referenceNumber: row.reference_number,
    notes: row.notes,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  };
}

function toSubscription(row: any): Subscription {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.leads?.company || row.leads?.first_name,
    planName: row.plan_name,
    planAmount: Number(row.plan_amount),
    billingCycle: row.billing_cycle,
    startDate: row.start_date,
    nextBillingDate: row.next_billing_date,
    endDate: row.end_date,
    status: row.status,
    autoRenew: row.auto_renew,
    createdAt: row.created_at,
  };
}

function toCommission(row: any): Commission {
  return {
    id: row.id,
    repId: row.rep_id,
    repName: row.profiles?.global_role,
    dealId: row.deal_id,
    dealName: row.leads?.company || row.leads?.first_name,
    dealAmount: Number(row.deal_amount),
    commissionRate: Number(row.commission_rate),
    commissionAmount: Number(row.commission_amount),
    commissionType: row.commission_type,
    status: row.status,
    paymentDate: row.payment_date,
    approvedBy: row.approved_by,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function toRevenueTarget(row: any): RevenueTarget {
  return {
    id: row.id,
    targetType: row.target_type,
    targetOwnerId: row.target_owner_id,
    ownerName: row.profiles?.global_role,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    achievementPercentage: Number(row.achievement_percentage),
  };
}

// Payments hooks
export function usePayments(invoiceId?: string) {
  return useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: async () => {
      let query = supabase.from('payments').select('*').order('payment_date', { ascending: false });
      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toPayment);
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: {
      invoiceId: string;
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      transactionId?: string;
      referenceNumber?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('payments')
        .insert({
          invoice_id: payment.invoiceId,
          amount: payment.amount,
          payment_date: payment.paymentDate,
          payment_method: payment.paymentMethod,
          transaction_id: payment.transactionId,
          reference_number: payment.referenceNumber,
          notes: payment.notes,
          recorded_by: user.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return toPayment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// Subscriptions hooks
export function useSubscriptions(status?: string) {
  return useQuery({
    queryKey: ['subscriptions', status],
    queryFn: async () => {
      let query = supabase
        .from('subscriptions')
        .select('*, leads(id, first_name, last_name, company)')
        .order('created_at', { ascending: false });
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toSubscription);
    },
  });
}

export function useAddSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sub: {
      customerId: string;
      planName: string;
      planAmount: number;
      billingCycle: string;
      startDate: string;
      nextBillingDate?: string;
    }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          customer_id: sub.customerId,
          plan_name: sub.planName,
          plan_amount: sub.planAmount,
          billing_cycle: sub.billingCycle,
          start_date: sub.startDate,
          next_billing_date: sub.nextBillingDate,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      return toSubscription(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

// Commissions hooks
export function useCommissions(status?: string) {
  return useQuery({
    queryKey: ['commissions', status],
    queryFn: async () => {
      let query = supabase
        .from('commissions')
        .select('*, leads(id, first_name, last_name, company)')
        .order('created_at', { ascending: false });
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toCommission);
    },
  });
}

export function useAddCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (comm: {
      repId: string;
      dealId?: string;
      dealAmount: number;
      commissionRate: number;
      commissionType?: string;
      notes?: string;
    }) => {
      const commissionAmount = comm.dealAmount * comm.commissionRate;
      const { data, error } = await supabase
        .from('commissions')
        .insert({
          rep_id: comm.repId,
          deal_id: comm.dealId,
          deal_amount: comm.dealAmount,
          commission_rate: comm.commissionRate,
          commission_amount: commissionAmount,
          commission_type: comm.commissionType || 'percentage',
          notes: comm.notes,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return toCommission(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

export function useUpdateCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, approvedBy }: { id: string; status: string; approvedBy?: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (approvedBy) updates.approved_by = approvedBy;
      if (status === 'paid') updates.payment_date = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('commissions').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

// Revenue targets hooks
export function useRevenueTargets(periodType?: string) {
  return useQuery({
    queryKey: ['revenue-targets', periodType],
    queryFn: async () => {
      let query = supabase.from('revenue_targets').select('*').order('period_start', { ascending: false });
      if (periodType) {
        query = query.eq('period_type', periodType);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(toRevenueTarget);
    },
  });
}

export function useAddRevenueTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: {
      targetType: string;
      targetOwnerId?: string;
      periodType: string;
      periodStart: string;
      periodEnd: string;
      targetAmount: number;
    }) => {
      const { data, error } = await supabase
        .from('revenue_targets')
        .insert({
          target_type: target.targetType,
          target_owner_id: target.targetOwnerId,
          period_type: target.periodType,
          period_start: target.periodStart,
          period_end: target.periodEnd,
          target_amount: target.targetAmount,
          current_amount: 0,
          achievement_percentage: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return toRevenueTarget(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-targets'] });
    },
  });
}

// Billing stats
export function useBillingStats() {
  return useQuery({
    queryKey: ['billing-stats'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Get invoices this month
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid, status')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      // Get subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('plan_amount, billing_cycle')
        .eq('status', 'active');

      // Get commissions this month
      const { data: comms } = await supabase
        .from('commissions')
        .select('commission_amount, status')
        .gte('created_at', startOfMonth);

      const invoiced = (invoices || []).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      const paid = (invoices || []).reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
      const due = invoiced - paid;
      const overdue = (invoices || [])
        .filter((inv) => inv.status === 'overdue')
        .reduce((sum, inv) => sum + (Number(inv.total_amount) - Number(inv.amount_paid)), 0);

      const mrr = (subs || []).reduce((sum, sub) => {
        const amount = Number(sub.plan_amount);
        switch (sub.billing_cycle) {
          case 'monthly': return sum + amount;
          case 'quarterly': return sum + amount / 3;
          case 'annually': return sum + amount / 12;
          default: return sum + amount;
        }
      }, 0);

      const totalCommissions = (comms || []).reduce((sum, c) => sum + Number(c.commission_amount), 0);
      const pendingCommissions = (comms || [])
        .filter((c) => c.status === 'pending')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0);
      const paidCommissions = (comms || [])
        .filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0);

      return {
        invoiced,
        paid,
        due,
        overdue,
        mrr,
        arr: mrr * 12,
        activeSubscriptions: (subs || []).length,
        totalCommissions,
        pendingCommissions,
        paidCommissions,
      };
    },
  });
}
