import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string | null;
  role_id: string | null;
  status: 'active' | 'inactive' | 'invited' | 'suspended';
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  last_active_at: string | null;
  created_at: string;
  role?: Role;
  email?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  seat_limit: number;
  seats_used: number;
  storage_limit_gb: number;
  storage_used_gb: number;
  created_at: string;
  subscription_expires_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface UsageLimit {
  id: string;
  organization_id: string | null;
  limit_type: string;
  limit_value: number;
  current_usage: number;
  reset_period: string;
  last_reset_at: string | null;
  created_at: string;
}

// Fetch all roles
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        permissions: Array.isArray(r.permissions) ? r.permissions : []
      })) as Role[];
    }
  });
}

// Fetch team members
export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          role:roles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(tm => ({
        ...tm,
        role: tm.role ? {
          ...tm.role,
          permissions: Array.isArray(tm.role.permissions) ? tm.role.permissions : []
        } : undefined
      })) as TeamMember[];
    }
  });
}

// Invite team member
export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      email, 
      roleId, 
      organizationId 
    }: { 
      email: string; 
      roleId: string; 
      organizationId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create a placeholder user_id (in real app, would send invite email)
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          user_id: user.id, // Placeholder - would be updated when user accepts
          organization_id: organizationId || null,
          role_id: roleId,
          status: 'invited',
          invited_by: user.id,
          invited_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_action: 'invite',
        p_resource_type: 'user',
        p_resource_id: data.id,
        p_details: { email, role_id: roleId } as unknown as Json
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({ title: 'Invitation sent successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send invitation', description: error.message, variant: 'destructive' });
    }
  });
}

// Update team member
export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      roleId, 
      status 
    }: { 
      id: string; 
      roleId?: string; 
      status?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (roleId) updates.role_id = roleId;
      if (status) updates.status = status;

      const { data, error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_action: 'update',
        p_resource_type: 'user',
        p_resource_id: id,
        p_details: updates as unknown as Json
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({ title: 'Team member updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    }
  });
}

// Remove team member
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Log before delete
      await supabase.rpc('log_audit_event', {
        p_action: 'delete',
        p_resource_type: 'user',
        p_resource_id: id,
        p_details: {} as unknown as Json
      });

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({ title: 'Team member removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive' });
    }
  });
}

// Create custom role
export function useCreateRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      permissions 
    }: { 
      name: string; 
      description?: string; 
      permissions: string[];
    }) => {
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name,
          description,
          permissions: permissions as unknown as Json,
          is_system_role: false
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc('log_audit_event', {
        p_action: 'create',
        p_resource_type: 'role',
        p_resource_id: data.id,
        p_details: { name, permissions } as unknown as Json
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Role created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create role', description: error.message, variant: 'destructive' });
    }
  });
}

// Fetch audit logs
export function useAuditLogs(filters?: { action?: string; days?: number }) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.days) {
        const since = new Date();
        since.setDate(since.getDate() - filters.days);
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    }
  });
}

// Fetch usage limits
export function useUsageLimits(organizationId?: string) {
  return useQuery({
    queryKey: ['usage-limits', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('usage_limits')
        .select('*');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UsageLimit[];
    }
  });
}

// Fetch organizations
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Organization[];
    }
  });
}

// Permission definitions
export const PERMISSION_GROUPS = {
  leads: {
    label: 'Leads',
    permissions: [
      { key: 'leads.create', label: 'Create leads' },
      { key: 'leads.read.own', label: 'View own leads' },
      { key: 'leads.read.team', label: 'View team leads' },
      { key: 'leads.read.all', label: 'View all leads' },
      { key: 'leads.update.own', label: 'Edit own leads' },
      { key: 'leads.update.team', label: 'Edit team leads' },
      { key: 'leads.update.all', label: 'Edit all leads' },
      { key: 'leads.delete', label: 'Delete leads' },
      { key: 'leads.assign', label: 'Assign leads' },
      { key: 'leads.export', label: 'Export leads' }
    ]
  },
  users: {
    label: 'Users',
    permissions: [
      { key: 'users.create', label: 'Create users' },
      { key: 'users.read', label: 'View users' },
      { key: 'users.update', label: 'Edit users' },
      { key: 'users.delete', label: 'Delete users' },
      { key: 'users.invite', label: 'Invite users' },
      { key: 'users.suspend', label: 'Suspend users' }
    ]
  },
  reports: {
    label: 'Reports',
    permissions: [
      { key: 'reports.create', label: 'Create reports' },
      { key: 'reports.read.own', label: 'View own reports' },
      { key: 'reports.read.team', label: 'View team reports' },
      { key: 'reports.read.all', label: 'View all reports' },
      { key: 'reports.export', label: 'Export reports' }
    ]
  },
  settings: {
    label: 'Settings',
    permissions: [
      { key: 'settings.organization', label: 'Manage organization' },
      { key: 'settings.billing', label: 'Manage billing' },
      { key: 'settings.integrations', label: 'Manage integrations' },
      { key: 'settings.team', label: 'Manage team' }
    ]
  },
  audit: {
    label: 'Audit',
    permissions: [
      { key: 'audit.read', label: 'View audit logs' }
    ]
  }
};

// Role color mapping
export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500',
  admin: 'bg-orange-500',
  manager: 'bg-yellow-500',
  sales_rep: 'bg-green-500',
  viewer: 'bg-blue-500'
};

// Status color mapping
export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  invited: 'bg-blue-500',
  suspended: 'bg-red-500'
};
