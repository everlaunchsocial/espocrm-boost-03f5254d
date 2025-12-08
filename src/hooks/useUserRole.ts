import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GlobalRole = 'super_admin' | 'admin' | 'affiliate' | 'customer';

interface UseUserRoleResult {
  role: GlobalRole;
  isLoading: boolean;
  userId: string | null;
  isAdmin: boolean;
  isAffiliate: boolean;
  isCustomer: boolean;
}

export function getGlobalRole(profile: { global_role?: string } | null): GlobalRole {
  if (!profile?.global_role) return 'customer';
  const validRoles: GlobalRole[] = ['super_admin', 'admin', 'affiliate', 'customer'];
  return validRoles.includes(profile.global_role as GlobalRole) 
    ? (profile.global_role as GlobalRole) 
    : 'customer';
}

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<GlobalRole>('customer');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          if (isMounted) {
            setRole('customer');
            setUserId(null);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setUserId(user.id);
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('global_role')
          .eq('user_id', user.id)
          .single();

        if (isMounted) {
          if (error || !profile) {
            setRole('customer');
          } else {
            setRole(getGlobalRole(profile));
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        if (isMounted) {
          setRole('customer');
          setIsLoading(false);
        }
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    isLoading,
    userId,
    isAdmin: role === 'super_admin' || role === 'admin',
    isAffiliate: role === 'affiliate',
    isCustomer: role === 'customer',
  };
}
