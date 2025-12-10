/**
 * Stripe Price ID configuration for affiliate plans
 * These values should be set in environment variables after creating products in Stripe
 */

export const AFFILIATE_STRIPE_PRICES = {
  basic: import.meta.env.VITE_STRIPE_AFFILIATE_BASIC_PRICE_ID || null,
  pro: import.meta.env.VITE_STRIPE_AFFILIATE_PRO_PRICE_ID || null,
  agency: import.meta.env.VITE_STRIPE_AFFILIATE_AGENCY_PRICE_ID || null,
} as const;

export type AffiliatePlanCode = 'free' | 'basic' | 'pro' | 'agency';

export function getStripePriceId(planCode: AffiliatePlanCode): string | null {
  if (planCode === 'free') return null; // Free has no Stripe checkout
  return AFFILIATE_STRIPE_PRICES[planCode] || null;
}

export function isStripeConfigured(planCode: AffiliatePlanCode): boolean {
  if (planCode === 'free') return true; // Free doesn't need Stripe
  return !!getStripePriceId(planCode);
}
