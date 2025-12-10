/**
 * Demo Credits Policy Helpers
 * Used to manage affiliate demo credit balances and limits
 */

export type AffiliatePlanCode = 'free' | 'basic' | 'pro' | 'agency';

export interface AffiliatePlan {
  id: string;
  name: string;
  code: string;
  monthly_price: number;
  demo_credits_per_month: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
}

/**
 * Check if a plan has unlimited demos
 * Unlimited is represented by null or -1
 */
export function isUnlimitedDemos(demoCreditsPerMonth: number | null): boolean {
  return demoCreditsPerMonth === null || demoCreditsPerMonth === -1;
}

/**
 * Get the initial credit balance for a plan
 * Returns null for unlimited plans
 */
export function getInitialCreditsForPlan(plan: Pick<AffiliatePlan, 'demo_credits_per_month'> | null): number | null {
  if (!plan) return null;
  if (isUnlimitedDemos(plan.demo_credits_per_month)) return null;
  return plan.demo_credits_per_month ?? 0;
}

/**
 * Check if an affiliate has credits available
 * Returns true if they have credits remaining OR have an unlimited plan
 */
export function hasCreditsAvailable(
  creditsBalance: number | null,
  demoCreditsPerMonth: number | null
): boolean {
  // Unlimited plan
  if (isUnlimitedDemos(demoCreditsPerMonth)) return true;
  // Has remaining credits
  if (creditsBalance === null) return false;
  return creditsBalance > 0;
}

/**
 * Format credits display for UI
 */
export function formatCreditsDisplay(
  creditsBalance: number | null,
  demoCreditsPerMonth: number | null
): string {
  if (isUnlimitedDemos(demoCreditsPerMonth)) {
    return 'Unlimited';
  }
  return `${creditsBalance ?? 0} / ${demoCreditsPerMonth ?? 0}`;
}

/**
 * Calculate days until credits reset
 */
export function getDaysUntilReset(resetAt: string | null): number | null {
  if (!resetAt) return null;
  const resetDate = new Date(resetAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
