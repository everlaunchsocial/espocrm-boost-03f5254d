import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
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
  affiliate_id?: string;
  affiliate_username?: string;
}

interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
}

interface AdminPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

interface EditAdminDialogProps {
  admin: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditAdminDialog({
  admin,
  open,
  onOpenChange,
  onSuccess,
}: EditAdminDialogProps) {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>(admin.role_id);
  const [notes, setNotes] = useState(admin.notes || '');

  // Fetch available roles (exclude super_admin)
  const { data: roles } = useQuery({
    queryKey: ['admin-roles-for-edit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .neq('name', 'super_admin')
        .order('is_system_role', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as AdminRole[];
    },
    enabled: open,
  });

  // Fetch permissions for the current role
  const { data: rolePermissions } = useQuery({
    queryKey: ['role-permissions', selectedRoleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_role_permissions')
        .select('permission_id, permission:admin_permissions(*)')
        .eq('role_id', selectedRoleId);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedRoleId && open,
  });

  // Update admin mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_admin_roles')
        .update({
          role_id: selectedRoleId,
          notes: notes || null,
        })
        .eq('id', admin.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      toast.success('Admin updated successfully');
      onSuccess();
    },
    onError: (error) => {
      console.error('Error updating admin:', error);
      toast.error('Failed to update admin');
    },
  });

  // Reset form when admin changes
  useEffect(() => {
    setSelectedRoleId(admin.role_id);
    setNotes(admin.notes || '');
  }, [admin]);

  // Group permissions by category
  const permissionsByCategory = rolePermissions?.reduce((acc, rp) => {
    const perm = rp.permission as AdminPermission;
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, AdminPermission[]>) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Admin: {admin.affiliate_username || 'Unknown User'}</DialogTitle>
          <DialogDescription>
            Update role and permissions for this admin user
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Admin Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Admin Since:</span>
                  <p className="font-medium">{format(new Date(admin.granted_at), 'MMM d, yyyy')}</p>
                </div>
                {admin.affiliate_id && (
                  <div>
                    <span className="text-muted-foreground">Also an Affiliate:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{admin.affiliate_username}</Badge>
                      <Link 
                        to={`/admin/affiliates`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Role Selection */}
            <div className="space-y-4">
              <Label className="text-base">Current Role</Label>
              <RadioGroup value={selectedRoleId} onValueChange={setSelectedRoleId}>
                {roles?.map((role) => (
                  <div key={role.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={role.id} id={`role-${role.id}`} />
                    <Label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {role.name === 'admin' ? (
                          <Crown className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium capitalize">{role.name.replace('_', ' ')}</span>
                        {role.is_system_role && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Permissions Preview */}
            {Object.keys(permissionsByCategory).length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base">Role Permissions</Label>
                  <div className="border rounded-lg">
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="px-4 text-sm font-medium capitalize hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <span>{category}</span>
                              <Badge variant="secondary" className="text-xs">
                                {permissions.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-2">
                              {permissions.map((perm) => (
                                <div key={perm.id} className="flex items-start space-x-3">
                                  <Checkbox checked disabled className="mt-0.5" />
                                  <div className="grid gap-1 leading-none">
                                    <span className="text-sm">{perm.name}</span>
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
                  </div>
                  <p className="text-xs text-muted-foreground">
                    To edit permissions, go to Role Management and modify the role.
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Business partner - needs access to customer reports"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
