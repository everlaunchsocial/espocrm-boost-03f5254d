import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServiceUsageRow {
  id: string;
  provider: string;
  model: string | null;
  usage_type: string;
  call_type: string | null;
  customer_id: string | null;
  affiliate_id: string | null;
  demo_id: string | null;
  duration_seconds: number;
  tokens_in: number;
  tokens_out: number;
  message_count: number;
  cost_usd: number;
  cost_breakdown: Record<string, unknown>;
  session_id: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UsageAlert {
  id: string;
  alert_type: string;
  entity_type: string;
  entity_id: string;
  threshold_value: number | null;
  current_value: number | null;
  message: string | null;
  metadata: Record<string, unknown>;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface UsageSummary {
  total_cost: number;
  total_duration_seconds: number;
  total_messages: number;
  by_provider: Record<string, { cost: number; count: number }>;
  by_usage_type: Record<string, { cost: number; count: number }>;
  by_call_type: Record<string, { cost: number; count: number }>;
}

export function useServiceUsageSummary(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['service-usage-summary', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<UsageSummary> => {
      let query = supabase
        .from('service_usage')
        .select('*');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = (data || []) as ServiceUsageRow[];
      
      const summary: UsageSummary = {
        total_cost: 0,
        total_duration_seconds: 0,
        total_messages: 0,
        by_provider: {},
        by_usage_type: {},
        by_call_type: {}
      };

      for (const row of rows) {
        const cost = Number(row.cost_usd) || 0;
        summary.total_cost += cost;
        summary.total_duration_seconds += row.duration_seconds || 0;
        summary.total_messages += row.message_count || 0;

        // By provider
        if (!summary.by_provider[row.provider]) {
          summary.by_provider[row.provider] = { cost: 0, count: 0 };
        }
        summary.by_provider[row.provider].cost += cost;
        summary.by_provider[row.provider].count += 1;

        // By usage type
        if (!summary.by_usage_type[row.usage_type]) {
          summary.by_usage_type[row.usage_type] = { cost: 0, count: 0 };
        }
        summary.by_usage_type[row.usage_type].cost += cost;
        summary.by_usage_type[row.usage_type].count += 1;

        // By call type
        const callType = row.call_type || 'unknown';
        if (!summary.by_call_type[callType]) {
          summary.by_call_type[callType] = { cost: 0, count: 0 };
        }
        summary.by_call_type[callType].cost += cost;
        summary.by_call_type[callType].count += 1;
      }

      return summary;
    }
  });
}

export function useServiceUsageByCustomer(customerId: string) {
  return useQuery({
    queryKey: ['service-usage-customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_usage')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ServiceUsageRow[];
    },
    enabled: !!customerId
  });
}

export function useServiceUsageByAffiliate(affiliateId: string) {
  return useQuery({
    queryKey: ['service-usage-affiliate', affiliateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_usage')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ServiceUsageRow[];
    },
    enabled: !!affiliateId
  });
}

export function useActiveAlerts() {
  return useQuery({
    queryKey: ['usage-alerts-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UsageAlert[];
    }
  });
}

export function useCustomerAlerts(customerId: string) {
  return useQuery({
    queryKey: ['usage-alerts-customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_alerts')
        .select('*')
        .eq('entity_type', 'customer')
        .eq('entity_id', customerId)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UsageAlert[];
    },
    enabled: !!customerId
  });
}

export async function acknowledgeAlert(alertId: string, userId: string) {
  const { error } = await supabase
    .from('usage_alerts')
    .update({ 
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId
    })
    .eq('id', alertId);

  if (error) throw error;
}

export async function resolveAlert(alertId: string, userId: string) {
  const { error } = await supabase
    .from('usage_alerts')
    .update({ 
      resolved_at: new Date().toISOString(),
      resolved_by: userId
    })
    .eq('id', alertId);

  if (error) throw error;
}
