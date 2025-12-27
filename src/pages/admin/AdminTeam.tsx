import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminPermissions, PERMISSIONS } from '@/hooks/useAdminPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Users, Search, Shield, ShieldCheck, Edit, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditAdminDialog } from '@/components/admin/EditAdminDialog';

interface AdminUser {
  id: string;
  user_id: string;
  role_id: string;
  granted_by: string | null;
  granted_at: string;
  notes: string | null;
  role: {
    id: string;
    name: string;
    description: string | null;
    is_system_role: boolean;
  };
  email?: string;
  affiliate_id?: string;
  affiliate_username?: string;
}

export default function AdminTeam() {
  const { role, userId } = useUserRole();
  const { hasPermission, isSuperAdmin } = useAdminPermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [removingAdmin, setRemovingAdmin] = useState<AdminUser | null>(null);

  const canManageUsers = hasPermission(PERMISSIONS.SYSTEM_MANAGE_USERS);

  // Fetch all admin users with their roles
  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ['admin-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_admin_roles')
        .select(`
          *,
          role:admin_roles(*)
        `)
        .order('granted_at', { ascending: false });

      if (error) throw error;

      // Get user emails from auth (we'll use profiles as fallback)
      const userIds = data?.map(d => d.user_id) || [];
      
      // Try to get emails from profiles or affiliates
      const { data: affiliates } = await supabase
        .from('affiliates')
        .select('id, username, user_id')
        .in('user_id', userIds);

      const affiliateMap = new Map(affiliates?.map(a => [a.user_id, { id: a.id, username: a.username }]));

      return (data || []).map(admin => ({
        ...admin,
        affiliate_id: affiliateMap.get(admin.user_id)?.id,
        affiliate_username: affiliateMap.get(admin.user_id)?.username,
      })) as AdminUser[];
    },
    enabled: canManageUsers || isSuperAdmin,
  });

  // Remove admin role mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const { error } = await supabase
        .from('user_admin_roles')
        .delete()
        .eq('id', adminId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success('Admin access removed successfully');
      setRemovingAdmin(null);
    },
    onError: (error) => {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin access');
    },
  });

  const filteredAdmins = adminUsers?.filter(admin =>
    admin.affiliate_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.role?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  const getRoleIcon = (roleName: string) => {
    if (roleName === 'super_admin') return <Crown className="h-4 w-4 text-yellow-500" />;
    if (roleName === 'admin') return <ShieldCheck className="h-4 w-4 text-blue-500" />;
    return <Shield className="h-4 w-4 text-muted-foreground" />;
  };

  const getRoleBadgeVariant = (roleName: string): "default" | "secondary" | "outline" => {
    if (roleName === 'super_admin') return 'default';
    if (roleName === 'admin') return 'secondary';
    return 'outline';
  };

  if (!canManageUsers && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage admin users and their permissions</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Admin Users ({filteredAdmins.length})
          </CardTitle>
          <CardDescription>
            Users with administrative access to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Also Affiliate</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead>Notes</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => {
                const isCurrentUser = admin.user_id === userId;
                const isSuperAdminRole = admin.role?.name === 'super_admin';

                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(admin.role?.name)}
                        <span className="font-medium">
                          {admin.affiliate_username || 'Unknown User'}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(admin.role?.name)}>
                        {admin.role?.name.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.affiliate_id ? (
                        <Badge variant="outline" className="text-xs">
                          {admin.affiliate_username}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(admin.granted_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {admin.notes || '-'}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        {!isCurrentUser && !isSuperAdminRole && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingAdmin(admin)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setRemovingAdmin(admin)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {isSuperAdminRole && (
                          <span className="text-xs text-muted-foreground">Protected</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No admin users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Admin Dialog */}
      {editingAdmin && (
        <EditAdminDialog
          admin={editingAdmin}
          open={!!editingAdmin}
          onOpenChange={(open) => !open && setEditingAdmin(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-team'] });
            setEditingAdmin(null);
          }}
        />
      )}

      {/* Remove Admin Confirmation */}
      <AlertDialog open={!!removingAdmin} onOpenChange={(open) => !open && setRemovingAdmin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin access for{' '}
              <strong>{removingAdmin?.affiliate_username || 'this user'}</strong>?
              {removingAdmin?.affiliate_id && (
                <span className="block mt-2 text-sm">
                  Note: Their affiliate account will remain intact.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingAdmin && removeAdminMutation.mutate(removingAdmin.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
