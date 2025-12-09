import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GlobalRole = 'super_admin' | 'admin' | 'affiliate' | 'customer';

interface UseUserRoleResult {
  role: GlobalRole;
  isLoading: boolean;
  userId: string | null;
  isAdmin: boolean;
  isAffiliate: boolean;
  isCustomer: boolean;
  refreshRole: () => Promise<void>;
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

  const fetchUserRole = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('[useUserRole] Current user:', user?.id, user?.email);
      
      if (!user) {
        console.log('[useUserRole] No user found, defaulting to customer');
        setRole('customer');
        setUserId(null);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Use RPC function to bypass RLS and get the role reliably
      const { data: globalRole, error } = await supabase
        .rpc('get_my_global_role');

      console.log('[useUserRole] RPC get_my_global_role result:', { globalRole, error });

      if (error) {
        console.error('[useUserRole] Error fetching role via RPC:', error);
        setRole('customer');
      } else if (!globalRole) {
        console.warn('[useUserRole] No role found for user:', user.id);
        setRole('customer');
      } else {
        const resolvedRole = getGlobalRole({ global_role: globalRole });
        console.log('[useUserRole] Resolved role:', resolvedRole);
        setRole(resolvedRole);
      }
    } catch (error) {
      console.error('[useUserRole] Unexpected error:', error);
      setRole('customer');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[useUserRole] Auth state changed:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserRole();
      } else if (event === 'SIGNED_OUT') {
        setRole('customer');
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  return {
    role,
    isLoading,
    userId,
    isAdmin: role === 'super_admin' || role === 'admin',
    isAffiliate: role === 'affiliate',
    isCustomer: role === 'customer',
    refreshRole: fetchUserRole,
  };
}
