import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface UserAdminRole {
  id: string;
  user_id: string;
  role_id: string;
  granted_by: string | null;
  granted_at: string;
  notes: string | null;
  role?: AdminRole;
}

interface UseAdminPermissionsResult {
  permissions: string[];
  roles: AdminRole[];
  isLoading: boolean;
  hasPermission: (permissionCode: string) => boolean;
  isSuperAdmin: boolean;
  isAnyAdmin: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to check user's admin permissions.
 * Returns list of permission codes the user has access to.
 */
export function useAdminPermissions(): UseAdminPermissionsResult {
  const { role: userRole, userId, isLoading: roleLoading } = useUserRole();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isSuperAdmin = userRole === 'super_admin';
  const isAnyAdmin = userRole === 'super_admin' || userRole === 'admin';

  const fetchPermissions = useCallback(async () => {
    if (!userId) {
      setPermissions([]);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get user's permissions via RPC
      const { data: permData, error: permError } = await supabase
        .rpc('get_user_permissions', { p_user_id: userId });

      if (permError) {
        console.error('[useAdminPermissions] Error fetching permissions:', permError);
        setPermissions([]);
      } else {
        setPermissions((permData || []).map((p: { permission_code: string }) => p.permission_code));
      }

      // Get user's admin roles
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_admin_roles', { p_user_id: userId });

      if (roleError) {
        console.error('[useAdminPermissions] Error fetching roles:', roleError);
        setRoles([]);
      } else {
        setRoles((roleData || []).map((r: { role_id: string; role_name: string; is_system_role: boolean }) => ({
          id: r.role_id,
          name: r.role_name,
          is_system_role: r.is_system_role,
        } as AdminRole)));
      }
    } catch (err) {
      console.error('[useAdminPermissions] Unexpected error:', err);
      setPermissions([]);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!roleLoading) {
      fetchPermissions();
    }
  }, [roleLoading, fetchPermissions]);

  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permissionCode);
  }, [permissions, isSuperAdmin]);

  return useMemo(() => ({
    permissions,
    roles,
    isLoading: isLoading || roleLoading,
    hasPermission,
    isSuperAdmin,
    isAnyAdmin,
    refetch: fetchPermissions,
  }), [permissions, roles, isLoading, roleLoading, hasPermission, isSuperAdmin, isAnyAdmin, fetchPermissions]);
}

// Permission code constants for type safety
export const PERMISSIONS = {
  // Customer permissions
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_IMPERSONATE: 'customers.impersonate',
  CUSTOMERS_MANAGE_SUBSCRIPTION: 'customers.manage_subscription',
  
  // Affiliate permissions
  AFFILIATES_VIEW: 'affiliates.view',
  AFFILIATES_EDIT: 'affiliates.edit',
  AFFILIATES_DELETE: 'affiliates.delete',
  AFFILIATES_IMPERSONATE: 'affiliates.impersonate',
  AFFILIATES_PROMOTE: 'affiliates.promote',
  AFFILIATES_REASSIGN: 'affiliates.reassign',
  
  // Commission permissions
  COMMISSIONS_VIEW: 'commissions.view',
  COMMISSIONS_APPROVE: 'commissions.approve',
  COMMISSIONS_ADJUST: 'commissions.adjust',
  
  // Payout permissions
  PAYOUTS_VIEW: 'payouts.view',
  PAYOUTS_PROCESS: 'payouts.process',
  
  // Support permissions
  SUPPORT_VIEW_TICKETS: 'support.view_tickets',
  SUPPORT_RESPOND: 'support.respond',
  SUPPORT_CLOSE: 'support.close',
  
  // Billing permissions
  BILLING_VIEW_SETTINGS: 'billing.view_settings',
  BILLING_EDIT_SETTINGS: 'billing.edit_settings',
  
  // Report permissions
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  
  // System permissions
  SYSTEM_MANAGE_ROLES: 'system.manage_roles',
  SYSTEM_MANAGE_USERS: 'system.manage_users',
  SYSTEM_VIEW_AUDIT_LOGS: 'system.view_audit_logs',
} as const;

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = [
  { key: 'customers', label: 'Customers', icon: 'Users' },
  { key: 'affiliates', label: 'Affiliates', icon: 'Network' },
  { key: 'commissions', label: 'Commissions', icon: 'DollarSign' },
  { key: 'payouts', label: 'Payouts', icon: 'Wallet' },
  { key: 'support', label: 'Support', icon: 'MessageSquare' },
  { key: 'billing', label: 'Billing', icon: 'CreditCard' },
  { key: 'reports', label: 'Reports', icon: 'BarChart3' },
  { key: 'system', label: 'System', icon: 'Settings' },
] as const;
