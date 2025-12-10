import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerSignupData {
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  website?: string;
}

export interface CustomerPlan {
  id: string;
  code: string;
  name: string;
  setupFee: number;
  monthlyPrice: number;
  minutesIncluded: number;
  overageRate: number;
}

interface SignupResult {
  success: boolean;
  customerId?: string;
  error?: string;
}

/**
 * Hook to handle customer signup and plan assignment
 */
export function useCustomerSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all active customer plans
   */
  const fetchPlans = async (): Promise<CustomerPlan[]> => {
    const { data, error } = await supabase
      .from('customer_plans')
      .select('*')
      .eq('is_active', true)
      .order('monthly_price', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return [];
    }

    return data.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      setupFee: Number(plan.setup_fee),
      monthlyPrice: Number(plan.monthly_price),
      minutesIncluded: plan.minutes_included,
      overageRate: Number(plan.overage_rate),
    }));
  };

  /**
   * Lookup affiliate by username
   */
  const lookupAffiliate = async (username: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('affiliates')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data.id;
  };

  /**
   * Create or update customer profile
   */
  const createCustomerProfile = async (
    userId: string,
    planId: string,
    affiliateId: string | null,
    customerData: CustomerSignupData
  ): Promise<SignupResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate billing cycle dates
      const today = new Date();
      const cycleStart = today.toISOString().split('T')[0];
      const cycleEnd = new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0];

      // Check if customer profile already exists for this user
      const { data: existingProfile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let customerId: string;

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('customer_profiles')
          .update({
            customer_plan_id: planId,
            affiliate_id: affiliateId,
            billing_cycle_start: cycleStart,
            billing_cycle_end: cycleEnd,
          })
          .eq('id', existingProfile.id);

        if (updateError) {
          throw new Error(`Failed to update customer profile: ${updateError.message}`);
        }
        customerId = existingProfile.id;
      } else {
        // Create new profile
        const { data: newProfile, error: insertError } = await supabase
          .from('customer_profiles')
          .insert({
            user_id: userId,
            customer_plan_id: planId,
            affiliate_id: affiliateId,
            billing_cycle_start: cycleStart,
            billing_cycle_end: cycleEnd,
          })
          .select('id')
          .single();

        if (insertError || !newProfile) {
          throw new Error(`Failed to create customer profile: ${insertError?.message}`);
        }
        customerId = newProfile.id;
      }

      // Create or update billing_subscriptions record
      const { data: existingSub } = await supabase
        .from('billing_subscriptions')
        .select('id')
        .eq('customer_id', customerId)
        .eq('subscription_type', 'customer')
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from('billing_subscriptions')
          .update({
            plan_id: planId,
            affiliate_id: affiliateId,
            status: 'pending_activation',
          })
          .eq('id', existingSub.id);
      } else {
        await supabase
          .from('billing_subscriptions')
          .insert({
            customer_id: customerId,
            subscription_type: 'customer',
            plan_id: planId,
            affiliate_id: affiliateId,
            status: 'pending_activation',
          });
      }

      // Optionally trigger test commissions (controlled by environment)
      const enableTestCommissions = import.meta.env.VITE_ENABLE_TEST_COMMISSIONS === 'true';
      if (enableTestCommissions && affiliateId) {
        // Get setup fee for the plan
        const { data: planData } = await supabase
          .from('customer_plans')
          .select('setup_fee')
          .eq('id', planId)
          .single();

        if (planData?.setup_fee) {
          // Call distribute_commissions in test mode
          const { error: commError } = await supabase.rpc('test_distribute_commissions', {
            p_customer_id: customerId,
            p_gross_amount: Number(planData.setup_fee),
          });

          if (commError) {
            console.warn('Test commission distribution failed:', commError.message);
          } else {
            console.log('Test commissions distributed for setup fee');
          }
        }
      }

      setIsLoading(false);
      return { success: true, customerId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setIsLoading(false);
      return { success: false, error: message };
    }
  };

  return {
    fetchPlans,
    lookupAffiliate,
    createCustomerProfile,
    isLoading,
    error,
  };
}
