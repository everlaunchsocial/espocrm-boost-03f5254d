import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GlobalRole = 'super_admin' | 'admin' | 'affiliate' | 'customer';

interface UseUserRoleResult {
  role: GlobalRole | null;
  isLoading: boolean;
  userId: string | null;
  isAdmin: boolean;
  isAffiliate: boolean;
  isCustomer: boolean;
  refreshRole: () => Promise<void>;
}

/**
 * Hook to get the current user's role from the user_roles table.
 * Uses the secure get_my_role RPC which bypasses RLS.
 * Returns null for role if not authenticated or role lookup fails.
 */
export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<GlobalRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const inFlightRef = useState({ inFlight: false, lastRun: 0 })[0];
  const queuedRef = useState({ queued: false })[0];

  const fetchUserRole = useCallback(async () => {
    const now = Date.now();
    if (inFlightRef.inFlight) return;
    if (now - inFlightRef.lastRun < 500) return;

    inFlightRef.inFlight = true;
    inFlightRef.lastRun = now;
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setRole(null);
        setUserId(null);
        setIsLoading(false);
        inFlightRef.inFlight = false;
        return;
      }

      setUserId(session.user.id);

      // Use the secure RPC to get role from user_roles table
      const { data: roleData, error: roleError } = await supabase.rpc('get_my_role');
      
      if (roleError) {
        console.error('[useUserRole] RPC error:', roleError);
        setRole(null);
        setIsLoading(false);
        inFlightRef.inFlight = false;
        return;
      }

      if (roleData && ['super_admin', 'admin', 'affiliate', 'customer'].includes(roleData)) {
        setRole(roleData as GlobalRole);
      } else {
        console.warn('[useUserRole] No role found for user');
        setRole(null);
      }
    } catch (err) {
      console.error('[useUserRole] Unexpected error:', err);
      setRole(null);
    } finally {
      inFlightRef.inFlight = false;
      setIsLoading(false);
    }
  }, [inFlightRef]);

  useEffect(() => {
    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (queuedRef.queued) return;
        queuedRef.queued = true;
        setTimeout(() => {
          queuedRef.queued = false;
          fetchUserRole();
        }, 50);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole, queuedRef]);

  return useMemo(() => ({
    role,
    isLoading,
    userId,
    isAdmin: role === 'super_admin' || role === 'admin',
    isAffiliate: role === 'affiliate',
    isCustomer: role === 'customer',
    refreshRole: fetchUserRole,
  }), [role, isLoading, userId, fetchUserRole]);
}
