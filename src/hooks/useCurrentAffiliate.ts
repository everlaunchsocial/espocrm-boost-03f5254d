import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentAffiliate {
  id: string;
  username: string;
  user_id: string;
  parent_affiliate_id: string | null;
}

export function useCurrentAffiliate() {
  const [affiliate, setAffiliate] = useState<CurrentAffiliate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAffiliate = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setAffiliate(null);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('affiliates')
          .select('id, user_id, username, parent_affiliate_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching affiliate:', error);
          setAffiliate(null);
        } else {
          console.log('Affiliate loaded:', data);
          setAffiliate(data);
        }
      } catch (err) {
        console.error('Exception fetching affiliate:', err);
        setAffiliate(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAffiliate();
  }, []);

  return { 
    affiliate, 
    isLoading,
    affiliateId: affiliate?.id ?? null 
  };
}
