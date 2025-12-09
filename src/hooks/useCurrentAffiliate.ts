import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentAffiliate {
  id: string;
  username: string;
  user_id: string;
  parent_affiliate_id: string | null;
  affiliate_plan_id: string | null;
  planCode?: string | null;
}

// Helper to check if currently impersonating
export function getImpersonationState() {
  const affiliateId = localStorage.getItem('impersonating_affiliate_id');
  const username = localStorage.getItem('impersonating_affiliate_username');
  return {
    isImpersonating: !!affiliateId,
    affiliateId,
    username,
  };
}

// Helper to clear impersonation
export function clearImpersonation() {
  localStorage.removeItem('impersonating_affiliate_id');
  localStorage.removeItem('impersonating_affiliate_username');
}

export function useCurrentAffiliate() {
  const [affiliate, setAffiliate] = useState<CurrentAffiliate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const fetchAffiliate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAffiliate(null);
        setIsLoading(false);
        return;
      }

      // Check if super_admin is impersonating an affiliate
      const impersonatingId = localStorage.getItem('impersonating_affiliate_id');
      
      if (impersonatingId) {
        // Verify user is super_admin before allowing impersonation
        const { data: roleData } = await supabase.rpc('get_my_global_role');
        
        if (roleData === 'super_admin') {
          // Fetch the impersonated affiliate's data with plan
          const { data, error } = await supabase
            .from('affiliates')
            .select('id, user_id, username, parent_affiliate_id, affiliate_plan_id, affiliate_plans(code)')
            .eq('id', impersonatingId)
            .maybeSingle();

          if (error) {
            console.error('Error fetching impersonated affiliate:', error);
            clearImpersonation();
          } else if (data) {
            console.log('Impersonating affiliate:', data);
            const planCode = (data.affiliate_plans as any)?.code || null;
            setAffiliate({ ...data, planCode });
            setIsImpersonating(true);
            setIsLoading(false);
            return;
          }
        } else {
          // Not super_admin, clear impersonation
          clearImpersonation();
        }
      }

      // Normal flow: fetch logged-in user's affiliate record with plan
      const { data, error } = await supabase
        .from('affiliates')
        .select('id, user_id, username, parent_affiliate_id, affiliate_plan_id, affiliate_plans(code)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching affiliate:', error);
        setAffiliate(null);
      } else if (data) {
        console.log('Affiliate loaded:', data);
        const planCode = (data.affiliate_plans as any)?.code || null;
        setAffiliate({ ...data, planCode });
      } else {
        setAffiliate(null);
      }
      setIsImpersonating(false);
    } catch (err) {
      console.error('Exception fetching affiliate:', err);
      setAffiliate(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliate();

    // Listen for storage changes to detect impersonation changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'impersonating_affiliate_id') {
        fetchAffiliate();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { 
    affiliate, 
    isLoading,
    affiliateId: affiliate?.id ?? null,
    isImpersonating,
    refetch: fetchAffiliate,
  };
}
