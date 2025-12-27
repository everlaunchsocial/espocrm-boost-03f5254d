import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

interface DualRoleAccess {
  hasAdminAccess: boolean;
  hasAffiliateAccess: boolean;
  isDualRole: boolean;
  isLoading: boolean;
  affiliateUsername: string | null;
}

/**
 * Hook to determine if the current user has dual-role access
 * (both admin privileges and an affiliate account)
 */
export function useDualRoleAccess(): DualRoleAccess {
  const { role, isLoading: roleLoading, userId, isAdmin } = useUserRole();
  const [hasAffiliateAccess, setHasAffiliateAccess] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [affiliateUsername, setAffiliateUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (roleLoading || !userId) {
        setIsLoading(roleLoading);
        return;
      }

      setIsLoading(true);

      try {
        // Check if user has admin role (from user_admin_roles table)
        const { data: adminRoles } = await supabase
          .from('user_admin_roles')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        const hasAdmin = isAdmin || (adminRoles && adminRoles.length > 0);
        setHasAdminAccess(hasAdmin);

        // Check if user has an affiliate account
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('username')
          .eq('user_id', userId)
          .maybeSingle();

        setHasAffiliateAccess(!!affiliate);
        setAffiliateUsername(affiliate?.username || null);
      } catch (error) {
        console.error('[useDualRoleAccess] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [userId, roleLoading, isAdmin]);

  return {
    hasAdminAccess,
    hasAffiliateAccess,
    isDualRole: hasAdminAccess && hasAffiliateAccess,
    isLoading,
    affiliateUsername,
  };
}
