import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin' | 'affiliate' | 'customer';

interface UseAuthRoleResult {
  role: AppRole | null;
  isLoading: boolean;
  userId: string | null;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get the current user's role from the user_roles table.
 * Uses the secure get_my_role RPC which bypasses RLS.
 * Returns null for role if not authenticated or role lookup fails.
 */
export function useAuthRole(): UseAuthRoleResult {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setRole(null);
        setUserId(null);
        setIsLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Use the secure RPC to get role from user_roles table
      const { data: roleData, error: roleError } = await supabase.rpc('get_my_role');
      
      if (roleError) {
        console.error('[useAuthRole] RPC error:', roleError);
        setError('Failed to determine account type');
        setRole(null);
        setIsLoading(false);
        return;
      }

      if (roleData && ['super_admin', 'admin', 'affiliate', 'customer'].includes(roleData)) {
        setRole(roleData as AppRole);
      } else {
        // No role found - this is unexpected, might be a timing issue with new user
        console.warn('[useAuthRole] No role found for user');
        setError('Account type not found');
        setRole(null);
      }
    } catch (err) {
      console.error('[useAuthRole] Unexpected error:', err);
      setError('Failed to determine account type');
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Defer to avoid potential deadlock
        setTimeout(fetchRole, 50);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setUserId(null);
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  return { role, isLoading, userId, error, refetch: fetchRole };
}

/**
 * Get the redirect path for a given role
 */
export function getRedirectPathForRole(role: AppRole | null): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/dashboard';
    case 'affiliate':
      return '/affiliate';
    case 'customer':
      return '/customer';
    default:
      return '/auth';
  }
}
