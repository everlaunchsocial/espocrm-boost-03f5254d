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
 * Load affiliate context by username using public RPC (works for unauthenticated users)
 */
export async function loadAffiliateContext(username: string): Promise<AffiliateContext | null> {
  // Use the public RPC that bypasses RLS for attribution
  const { data, error } = await supabase.rpc('get_affiliate_by_username', {
    p_username: username.toLowerCase()
  });

  if (error) {
    console.error('[loadAffiliateContext] RPC error:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const affiliate = Array.isArray(data) ? data[0] : data;
  
  return {
    id: affiliate.id,
    username: affiliate.username,
    userId: '', // Not returned by public RPC for security
    commissionPlanId: null,
    parentAffiliateId: null,
    createdAt: '',
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
