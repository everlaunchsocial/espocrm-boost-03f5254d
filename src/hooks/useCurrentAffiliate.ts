import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentAffiliate {
  id: string;
  username: string;
  userId: string;
  parent_affiliate_id?: string | null;
}

interface UseCurrentAffiliateResult {
  affiliate: CurrentAffiliate | null;
  isLoading: boolean;
  affiliateId: string | null;
}

/**
 * Hook to get the current logged-in user's affiliate record (if they are an affiliate)
 * Used for attributing leads/demos created within the affiliate back office
 */
export function useCurrentAffiliate(): UseCurrentAffiliateResult {
  const [affiliate, setAffiliate] = useState<CurrentAffiliate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchCurrentAffiliate = async () => {
      try {
        console.log('[useCurrentAffiliate] Fetching current user...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        console.log('[useCurrentAffiliate] User result:', { user: user?.id, email: user?.email, userError });
        
        if (!user) {
          console.log('[useCurrentAffiliate] No user found, returning null');
          if (isMounted) {
            setAffiliate(null);
            setIsLoading(false);
          }
          return;
        }

        console.log('[useCurrentAffiliate] Querying affiliates table for user_id:', user.id);
        
        const { data, error } = await supabase
          .from('affiliates')
          .select('id, username, user_id, parent_affiliate_id')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[useCurrentAffiliate] Query result:', { data, error });

        if (isMounted) {
          if (error) {
            console.error('[useCurrentAffiliate] Query error - RLS may be blocking:', error);
            setAffiliate(null);
          } else if (!data) {
            console.log('[useCurrentAffiliate] No affiliate record found for user');
            setAffiliate(null);
          } else {
            console.log('[useCurrentAffiliate] SUCCESS - Affiliate found:', data);
            setAffiliate({
              id: data.id,
              username: data.username,
              userId: data.user_id,
              parent_affiliate_id: data.parent_affiliate_id,
            });
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[useCurrentAffiliate] Unexpected error:', err);
        if (isMounted) {
          setAffiliate(null);
          setIsLoading(false);
        }
      }
    };

    fetchCurrentAffiliate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useCurrentAffiliate] Auth state changed:', event, session?.user?.id);
      fetchCurrentAffiliate();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  console.log('[useCurrentAffiliate] Returning:', { affiliate, isLoading, affiliateId: affiliate?.id ?? null });

  return {
    affiliate,
    isLoading,
    affiliateId: affiliate?.id ?? null,
  };
}
