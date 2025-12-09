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
      // Use getSession() to ensure JWT is ready before making RPC calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session || sessionError) {
        setRole('customer');
        setUserId(null);
        setIsLoading(false);
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      // Try the standard RPC first
      const { data: globalRole, error } = await supabase.rpc('get_my_global_role');

      if (!error && globalRole) {
        setRole(getGlobalRole({ global_role: globalRole }));
        setIsLoading(false);
        return;
      }

      // Fallback: use the user_id-based RPC for reliability
      const { data: fallbackRole, error: fallbackError } = await supabase
        .rpc('get_global_role_for_user', { p_user_id: currentUserId });

      if (!fallbackError && fallbackRole) {
        setRole(getGlobalRole({ global_role: fallbackRole }));
      } else {
        setRole('customer');
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
