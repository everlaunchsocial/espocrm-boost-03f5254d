import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { isUnlimitedDemos, formatCreditsDisplay, getDaysUntilReset } from '@/lib/demoCredits';

interface AffiliateCreditsData {
  creditsBalance: number | null;
  creditsPerMonth: number | null;
  resetAt: string | null;
  planName: string | null;
  planCode: string | null;
  isUnlimited: boolean;
  daysUntilReset: number | null;
  displayText: string;
}

interface CanCreateDemoResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Hook to get the current affiliate's demo credit information
 */
export function useAffiliateCredits() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();

  return useQuery({
    queryKey: ['affiliate-credits', affiliateId],
    queryFn: async (): Promise<AffiliateCreditsData> => {
      if (!affiliateId) {
        return {
          creditsBalance: null,
          creditsPerMonth: null,
          resetAt: null,
          planName: null,
          planCode: null,
          isUnlimited: false,
          daysUntilReset: null,
          displayText: 'No plan',
        };
      }

      // Get affiliate with plan info
      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .select(`
          demo_credits_balance,
          demo_credits_reset_at,
          affiliate_plan_id,
          affiliate_plans (
            name,
            code,
            demo_credits_per_month
          )
        `)
        .eq('id', affiliateId)
        .single();

      if (error) throw error;

      const plan = affiliate?.affiliate_plans as any;
      const creditsPerMonth = plan?.demo_credits_per_month ?? null;
      const isUnlimited = isUnlimitedDemos(creditsPerMonth);

      return {
        creditsBalance: affiliate?.demo_credits_balance ?? null,
        creditsPerMonth,
        resetAt: affiliate?.demo_credits_reset_at ?? null,
        planName: plan?.name ?? null,
        planCode: plan?.code ?? null,
        isUnlimited,
        daysUntilReset: getDaysUntilReset(affiliate?.demo_credits_reset_at ?? null),
        displayText: formatCreditsDisplay(affiliate?.demo_credits_balance ?? null, creditsPerMonth),
      };
    },
    enabled: !affiliateLoading && !!affiliateId,
  });
}

/**
 * Hook to check if affiliate can create a demo (has credits)
 */
export function useCanCreateDemo() {
  const { data: credits, isLoading } = useAffiliateCredits();

  const canCreate = (): CanCreateDemoResult => {
    if (isLoading || !credits) {
      return { allowed: false, reason: 'Loading credit information...' };
    }

    if (credits.isUnlimited) {
      return { allowed: true };
    }

    if (credits.creditsBalance === null || credits.creditsBalance <= 0) {
      return {
        allowed: false,
        reason: `You've used all your demo credits for this period. Please upgrade your plan or wait until your credits reset${
          credits.daysUntilReset !== null ? ` in ${credits.daysUntilReset} day${credits.daysUntilReset === 1 ? '' : 's'}` : ''
        }.`,
      };
    }

    return { allowed: true };
  };

  return {
    canCreate,
    credits,
    isLoading,
  };
}

/**
 * Function to decrement demo credits after successful demo creation
 * Called from the request-demo edge function or internal demo creation
 */
export async function decrementDemoCredits(affiliateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current affiliate info
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliates')
      .select(`
        demo_credits_balance,
        affiliate_plans (
          demo_credits_per_month
        )
      `)
      .eq('id', affiliateId)
      .single();

    if (fetchError) throw fetchError;

    const plan = affiliate?.affiliate_plans as any;
    const creditsPerMonth = plan?.demo_credits_per_month ?? null;

    // Don't decrement for unlimited plans
    if (isUnlimitedDemos(creditsPerMonth)) {
      return { success: true };
    }

    // Decrement credits
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        demo_credits_balance: Math.max(0, (affiliate?.demo_credits_balance ?? 0) - 1),
      })
      .eq('id', affiliateId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error('Error decrementing demo credits:', error);
    return { success: false, error: error.message };
  }
}
