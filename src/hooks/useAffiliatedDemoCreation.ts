import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { CreateDemoInput, useDemos } from './useDemos';

/**
 * Extended hook for creating demos with automatic affiliate attribution
 */
export function useAffiliatedDemoCreation() {
  const { affiliateId } = useCurrentAffiliate();
  const { createDemo } = useDemos();

  /**
   * Create a demo with automatic affiliate and rep attribution
   */
  const createAffiliatedDemo = async (input: Omit<CreateDemoInput, 'rep_id' | 'affiliate_id'>) => {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Create the demo with attribution
    return createDemo({
      ...input,
      rep_id: user.id,
      affiliate_id: affiliateId || null,
    });
  };

  return {
    createAffiliatedDemo,
    affiliateId,
  };
}
