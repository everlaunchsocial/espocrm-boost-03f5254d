import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AffiliateContext {
  id: string;
  username: string;
  userId: string;
  commissionPlanId: string | null;
  parentAffiliateId: string | null;
  createdAt: string;
}

interface UseAffiliateContextResult {
  affiliate: AffiliateContext | null;
  isLoading: boolean;
  error: string | null;
  notFound: boolean;
}

/**
 * Load affiliate context by username from the affiliates table
 */
export async function loadAffiliateContext(username: string): Promise<AffiliateContext | null> {
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    userId: data.user_id,
    commissionPlanId: data.commission_plan_id,
    parentAffiliateId: data.parent_affiliate_id,
    createdAt: data.created_at,
  };
}

/**
 * React hook to load affiliate context by username
 */
export function useAffiliateContext(username: string | undefined): UseAffiliateContextResult {
  const [affiliate, setAffiliate] = useState<AffiliateContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) {
      setIsLoading(false);
      setNotFound(true);
      return;
    }

    const fetchAffiliate = async () => {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const affiliateData = await loadAffiliateContext(username);
        
        if (!affiliateData) {
          setNotFound(true);
          setAffiliate(null);
        } else {
          setAffiliate(affiliateData);
        }
      } catch (err) {
        setError('Failed to load affiliate information');
        console.error('Error loading affiliate context:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAffiliate();
  }, [username]);

  return { affiliate, isLoading, error, notFound };
}

/**
 * Get affiliate ID from context for attribution
 */
export function getAffiliateIdFromContext(affiliate: AffiliateContext | null): string | null {
  return affiliate?.id ?? null;
}
