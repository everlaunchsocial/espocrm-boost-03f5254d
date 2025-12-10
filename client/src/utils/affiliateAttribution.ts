import { AffiliateContext } from '@/hooks/useAffiliateContext';

// Session storage key for storing affiliate attribution
const AFFILIATE_ATTRIBUTION_KEY = 'everlaunch_affiliate_id';

/**
 * Store affiliate ID in session storage for attribution
 * Used when a visitor lands on a replicated affiliate URL
 */
export function storeAffiliateAttribution(affiliateId: string): void {
  try {
    sessionStorage.setItem(AFFILIATE_ATTRIBUTION_KEY, affiliateId);
  } catch (error) {
    console.error('Failed to store affiliate attribution:', error);
  }
}

/**
 * Get stored affiliate ID from session storage
 * Returns null if no attribution is stored
 */
export function getStoredAffiliateId(): string | null {
  try {
    return sessionStorage.getItem(AFFILIATE_ATTRIBUTION_KEY);
  } catch (error) {
    console.error('Failed to get affiliate attribution:', error);
    return null;
  }
}

/**
 * Clear stored affiliate attribution
 */
export function clearAffiliateAttribution(): void {
  try {
    sessionStorage.removeItem(AFFILIATE_ATTRIBUTION_KEY);
  } catch (error) {
    console.error('Failed to clear affiliate attribution:', error);
  }
}

/**
 * Get affiliate ID for attribution from various sources
 * Priority: 1. Direct context, 2. Session storage
 */
export function resolveAffiliateId(
  contextAffiliate?: AffiliateContext | null,
  currentUserAffiliateId?: string | null
): string | null {
  // 1. If we have a direct affiliate context (from replicated URL)
  if (contextAffiliate?.id) {
    return contextAffiliate.id;
  }

  // 2. If the current user is an affiliate (creating from back office)
  if (currentUserAffiliateId) {
    return currentUserAffiliateId;
  }

  // 3. Check session storage for stored attribution
  return getStoredAffiliateId();
}

/**
 * Prepare lead data with affiliate attribution
 */
export function withAffiliateAttribution<T extends Record<string, unknown>>(
  data: T,
  affiliateId: string | null
): T & { affiliate_id?: string } {
  if (affiliateId) {
    return { ...data, affiliate_id: affiliateId };
  }
  return data;
}
