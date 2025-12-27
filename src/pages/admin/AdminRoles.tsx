import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions, PERMISSIONS, PERMISSION_CATEGORIES } from '@/hooks/useAdminPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Crown, Shield, ShieldCheck, Plus, Edit, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  permission_count?: number;
  user_count?: number;
}

interface AdminPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

export default function AdminRoles() {
  const { hasPermission, isSuperAdmin } = useAdminPermissions();
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const canManageRoles = hasPermission(PERMISSIONS.SYSTEM_MANAGE_ROLES);

  // Fetch all roles with counts
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data: rolesData, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('is_system_role', { ascending: false })
        .order('name');

      if (error) throw error;

      // Get permission counts per role
      const { data: permCounts } = await supabase
        .from('admin_role_permissions')
        .select('role_id');

      // Get user counts per role
      const { data: userCounts } = await supabase
        .from('user_admin_roles')
        .select('role_id');

      const permCountMap = new Map<string, number>();
      permCounts?.forEach(p => {
        permCountMap.set(p.role_id, (permCountMap.get(p.role_id) || 0) + 1);
      });

      const userCountMap = new Map<string, number>();
      userCounts?.forEach(u => {
        userCountMap.set(u.role_id, (userCountMap.get(u.role_id) || 0) + 1);
      });

      return (rolesData || []).map(role => ({
        ...role,
        permission_count: permCountMap.get(role.id) || 0,
        user_count: userCountMap.get(role.id) || 0,
      })) as AdminRole[];
    },
    enabled: canManageRoles || isSuperAdmin,
  });

  // Fetch all permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;
      return data as AdminPermission[];
    },
    enabled: canManageRoles || isSuperAdmin,
  });

  // Fetch permissions for a role
  const { data: rolePermissions, refetch: refetchRolePermissions } = useQuery({
    queryKey: ['role-permissions', editingRole?.id],
    queryFn: async () => {
      if (!editingRole) return [];
      
      const { data, error } = await supabase
        .from('admin_role_permissions')
        .select('permission_id')
        .eq('role_id', editingRole.id);

      if (error) throw error;
      return data?.map(p => p.permission_id) || [];
    },
    enabled: !!editingRole,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async () => {
      // Create role
      const { data: newRole, error: roleError } = await supabase
        .from('admin_roles')
        .insert({
          name: newRoleName.toLowerCase().replace(/\s+/g, '_'),
          description: newRoleDescription,
          is_system_role: false,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Assign permissions
      if (selectedPermissions.length > 0) {
        const permissionInserts = selectedPermissions.map(permId => ({
          role_id: newRole.id,
          permission_id: permId,
        }));

        const { error: permError } = await supabase
          .from('admin_role_permissions')
          .insert(permissionInserts);

        if (permError) throw permError;
      }

      return newRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Role created successfully');
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    },
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: string[] }) => {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('admin_role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (permissions.length > 0) {
        const permissionInserts = permissions.map(permId => ({
          role_id: roleId,
          permission_id: permId,
        }));

        const { error: insertError } = await supabase
          .from('admin_role_permissions')
          .insert(permissionInserts);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      refetchRolePermissions();
      toast.success('Permissions updated successfully');
    },
    onError: (error) => {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    },
  });

  const resetForm = () => {
    setNewRoleName('');
    setNewRoleDescription('');
    setSelectedPermissions([]);
  };

  const handleEditRole = (role: AdminRole) => {
    setEditingRole(role);
  };

  const handleSavePermissions = () => {
    if (editingRole) {
      updatePermissionsMutation.mutate({
        roleId: editingRole.id,
        permissions: selectedPermissions,
      });
    }
  };

  const getRoleIcon = (roleName: string, isSystem: boolean) => {
    if (roleName === 'super_admin') return <Crown className="h-5 w-5 text-yellow-500" />;
    if (roleName === 'admin') return <ShieldCheck className="h-5 w-5 text-blue-500" />;
    if (isSystem) return <Lock className="h-5 w-5 text-muted-foreground" />;
    return <Shield className="h-5 w-5 text-muted-foreground" />;
  };

  // Group permissions by category
  const permissionsByCategory = allPermissions?.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, AdminPermission[]>) || {};

  if (!canManageRoles && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (rolesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">Define roles and assign permissions</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Role
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {roles?.map((role) => (
          <Card key={role.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getRoleIcon(role.name, role.is_system_role)}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {role.name.replace('_', ' ')}
                      {role.is_system_role && (
                        <Badge variant="secondary" className="text-xs">System Role</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{role.description || 'No description'}</CardDescription>
                  </div>
                </div>
                {isSuperAdmin && role.name !== 'super_admin' && (
                  <Button variant="outline" size="sm" onClick={() => handleEditRole(role)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Permissions
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{role.user_count} users</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>{role.permission_count} permissions</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                placeholder="e.g., Sales Manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                placeholder="Describe what this role can do..."
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label>Permissions</Label>
              <ScrollArea className="h-[300px] border rounded-md p-4">
                <Accordion type="multiple" className="w-full">
                  {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-sm font-medium capitalize">
                        {category} ({permissions.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pl-4">
                          {permissions.map((perm) => (
                            <div key={perm.id} className="flex items-start space-x-3">
                              <Checkbox
                                id={perm.id}
                                checked={selectedPermissions.includes(perm.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPermissions([...selectedPermissions, perm.id]);
                                  } else {
                                    setSelectedPermissions(selectedPermissions.filter(p => p !== perm.id));
                                  }
                                }}
                              />
                              <div className="grid gap-1 leading-none">
                                <Label htmlFor={perm.id} className="cursor-pointer">
                                  {perm.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {perm.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createRoleMutation.mutate()}
              disabled={!newRoleName || createRoleMutation.isPending}
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Permissions Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Permissions: {editingRole?.name.replace('_', ' ')}</DialogTitle>
            <DialogDescription>
              {editingRole?.description}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] border rounded-md p-4">
            <Accordion type="multiple" className="w-full">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="text-sm font-medium capitalize">
                    {category} ({permissions.filter(p => selectedPermissions.includes(p.id)).length}/{permissions.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pl-4">
                      {permissions.map((perm) => (
                        <div key={perm.id} className="flex items-start space-x-3">
                          <Checkbox
                            id={`edit-${perm.id}`}
                            checked={selectedPermissions.includes(perm.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPermissions([...selectedPermissions, perm.id]);
                              } else {
                                setSelectedPermissions(selectedPermissions.filter(p => p !== perm.id));
                              }
                            }}
                          />
                          <div className="grid gap-1 leading-none">
                            <Label htmlFor={`edit-${perm.id}`} className="cursor-pointer">
                              {perm.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
            >
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
