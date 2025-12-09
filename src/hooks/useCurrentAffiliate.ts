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

  console.log('[useCurrentAffiliate] Hook initialized, current state:', { affiliate, isLoading });

  useEffect(() => {
    let isMounted = true;

    const fetchCurrentAffiliate = async () => {
      console.log('[useCurrentAffiliate] fetchCurrentAffiliate called');
      
      try {
        console.log('[useCurrentAffiliate] Getting current user from auth...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        console.log('[useCurrentAffiliate] Auth result:', { 
          userId: user?.id, 
          email: user?.email, 
          error: userError?.message 
        });
        
        if (!user) {
          console.log('[useCurrentAffiliate] No authenticated user found');
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

        console.log('[useCurrentAffiliate] Affiliates query result:', { 
          data, 
          error: error?.message,
          errorDetails: error?.details,
          errorHint: error?.hint
        });

        if (isMounted) {
          if (error) {
            console.error('[useCurrentAffiliate] Query ERROR - RLS may be blocking:', error);
            setAffiliate(null);
          } else if (!data) {
            console.warn('[useCurrentAffiliate] No affiliate record found for user:', user.id);
            setAffiliate(null);
          } else {
            console.log('[useCurrentAffiliate] SUCCESS - Affiliate record found:', data);
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
        console.error('[useCurrentAffiliate] Unexpected exception:', err);
        if (isMounted) {
          setAffiliate(null);
          setIsLoading(false);
        }
      }
    };

    fetchCurrentAffiliate();

    console.log('[useCurrentAffiliate] Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useCurrentAffiliate] Auth state changed:', event, 'userId:', session?.user?.id);
      fetchCurrentAffiliate();
    });

    return () => {
      console.log('[useCurrentAffiliate] Cleanup - unmounting');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  console.log('[useCurrentAffiliate] Returning:', { 
    affiliate, 
    isLoading, 
    affiliateId: affiliate?.id ?? null 
  });

  return {
    affiliate,
    isLoading,
    affiliateId: affiliate?.id ?? null,
  };
}
