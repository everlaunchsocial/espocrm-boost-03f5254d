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

  const inFlightRef = useState({ inFlight: false, lastRun: 0 })[0];
  const queuedRef = useState({ queued: false })[0];

  const fetchUserRole = useCallback(async () => {
    // Prevent stampedes (multiple components mount + auth events)
    const now = Date.now();
    if (inFlightRef.inFlight) return;
    if (now - inFlightRef.lastRun < 500) return;

    inFlightRef.inFlight = true;
    inFlightRef.lastRun = now;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data?.session ?? null;
      if (!session) {
        setRole('customer');
        setUserId(null);
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      // Try the standard RPC first
      const { data: globalRole, error: roleError } = await supabase.rpc('get_my_global_role');
      if (!roleError && globalRole) {
        setRole(getGlobalRole({ global_role: globalRole }));
        return;
      }

      // Fallback: use the user_id-based RPC for reliability
      const { data: fallbackRole, error: fallbackError } = await supabase.rpc('get_global_role_for_user', {
        p_user_id: currentUserId,
      });

      if (!fallbackError && fallbackRole) {
        setRole(getGlobalRole({ global_role: fallbackRole }));
      } else {
        setRole('customer');
      }
    } catch (error) {
      console.error('[useUserRole] Unexpected error:', error);
      setRole('customer');
      setUserId(null);
    } finally {
      inFlightRef.inFlight = false;
      setIsLoading(false);
    }
  }, [inFlightRef]);

  useEffect(() => {
    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Never call supabase inside the callback; defer to avoid deadlocks / loops.
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (queuedRef.queued) return;
        queuedRef.queued = true;
        setTimeout(() => {
          queuedRef.queued = false;
          fetchUserRole();
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setRole('customer');
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRole, queuedRef]);

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
