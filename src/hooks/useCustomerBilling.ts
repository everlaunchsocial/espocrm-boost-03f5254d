import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BillingSummary {
  customer_id: string;
  customer_plan_id: string | null;
  plan_code: string | null;
  plan_name: string | null;
  monthly_price: number | null;
  minutes_included: number | null;
  overage_rate: number | null;
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
  total_minutes_used: number | null;
  overage_minutes: number | null;
  overage_cost: number | null;
  base_cost: number | null;
  total_estimated_cost: number | null;
}

export function useCurrentCustomerBilling() {
  return useQuery({
    queryKey: ['current-customer-billing'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get customer profile for current user
      const { data: customerProfile, error: profileError } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!customerProfile) return null;

      // Call the billing function
      const { data, error } = await supabase
        .rpc('calculate_customer_cycle_charges', { p_customer_id: customerProfile.id });

      if (error) throw error;
      return (data && data.length > 0 ? data[0] : null) as BillingSummary | null;
    },
  });
}

export function useAllCustomersBilling() {
  return useQuery({
    queryKey: ['all-customers-billing'],
    queryFn: async () => {
      // Get all customer profiles
      const { data: customers, error: customersError } = await supabase
        .from('customer_profiles')
        .select('id, user_id, affiliate_id');

      if (customersError) throw customersError;
      if (!customers || customers.length === 0) return [];

      // Get billing summary for each customer
      const results: BillingSummary[] = [];
      for (const customer of customers) {
        const { data, error } = await supabase
          .rpc('calculate_customer_cycle_charges', { p_customer_id: customer.id });

        if (!error && data && data.length > 0) {
          results.push(data[0] as BillingSummary);
        }
      }

      return results;
    },
  });
}
