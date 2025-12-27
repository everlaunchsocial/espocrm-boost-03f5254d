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
import { AlertTriangle, Crown, Shield, User } from 'lucide-react';
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
import { format } from 'date-fns';

interface Affiliate {
  id: string;
  username: string;
  user_id: string;
  created_at: string;
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

interface PromoteToAdminDialogProps {
  affiliate: Affiliate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PromoteToAdminDialog({
  affiliate,
  open,
  onOpenChange,
  onSuccess,
}: PromoteToAdminDialogProps) {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Fetch available roles (exclude super_admin)
  const { data: roles } = useQuery({
    queryKey: ['admin-roles-for-promotion'],
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
    enabled: open,
  });

  // Check if affiliate is already an admin
  const { data: existingAdminRole } = useQuery({
    queryKey: ['affiliate-admin-status', affiliate?.user_id],
    queryFn: async () => {
      if (!affiliate) return null;
      
      const { data, error } = await supabase
        .from('user_admin_roles')
        .select('*, role:admin_roles(*)')
        .eq('user_id', affiliate.user_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!affiliate && open,
  });

  // Promote mutation
  const promoteMutation = useMutation({
    mutationFn: async () => {
      if (!affiliate) throw new Error('No affiliate selected');

      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error('Not authenticated');

      // If using custom permissions, we need to create a custom role first or use "admin" and override
      let roleId = selectedRoleId;

      if (useCustomPermissions && selectedPermissions.length > 0) {
        // For custom permissions, we create a custom role for this user
        const customRoleName = `custom_${affiliate.username}_${Date.now()}`;
        
        const { data: newRole, error: roleError } = await supabase
          .from('admin_roles')
          .insert({
            name: customRoleName,
            description: `Custom role for ${affiliate.username}`,
            is_system_role: false,
          })
          .select()
          .single();

        if (roleError) throw roleError;

        // Assign selected permissions to the custom role
        const permissionInserts = selectedPermissions.map(permId => ({
          role_id: newRole.id,
          permission_id: permId,
        }));

        const { error: permError } = await supabase
          .from('admin_role_permissions')
          .insert(permissionInserts);

        if (permError) throw permError;

        roleId = newRole.id;
      }

      // Assign the role to the user
      const { error: assignError } = await supabase
        .from('user_admin_roles')
        .insert({
          user_id: affiliate.user_id,
          role_id: roleId,
          granted_by: currentUser.data.user.id,
          notes: notes || null,
        });

      if (assignError) throw assignError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      toast.success(`${affiliate?.username} has been promoted to admin`);
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      console.error('Error promoting affiliate:', error);
      toast.error('Failed to promote affiliate');
    },
  });

  const resetForm = () => {
    setSelectedRoleId('');
    setUseCustomPermissions(false);
    setSelectedPermissions([]);
    setNotes('');
  };

  // Set default role when roles load
  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      const adminRole = roles.find(r => r.name === 'admin');
      if (adminRole) {
        setSelectedRoleId(adminRole.id);
      }
    }
  }, [roles, selectedRoleId]);

  // Group permissions by category
  const permissionsByCategory = allPermissions?.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, AdminPermission[]>) || {};

  if (!affiliate) return null;

  if (existingAdminRole) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Already an Admin</DialogTitle>
            <DialogDescription>
              {affiliate.username} already has admin access as{' '}
              <Badge variant="secondary">{existingAdminRole.role?.name.replace('_', ' ')}</Badge>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Promote Affiliate to Admin</DialogTitle>
          <DialogDescription>
            Grant admin access to {affiliate.username}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Affiliate Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{affiliate.username}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Affiliate since {format(new Date(affiliate.created_at), 'MMM d, yyyy')}
              </div>
              <div className="text-sm text-muted-foreground">
                Affiliate link: tryeverlaunch.com/{affiliate.username}
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400">Important:</p>
                  <ul className="mt-1 space-y-1 text-amber-600 dark:text-amber-300">
                    <li>• {affiliate.username} will KEEP their affiliate account and functionality</li>
                    <li>• Their affiliate link, commissions, and team remain active</li>
                    <li>• Admin access is ADDED on top of affiliate account</li>
                    <li>• They can recruit affiliates AND manage the platform</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Role Selection */}
            <div className="space-y-4">
              <Label className="text-base">Select Admin Role</Label>
              <RadioGroup value={selectedRoleId} onValueChange={(val) => {
                setSelectedRoleId(val);
                setUseCustomPermissions(false);
              }}>
                {roles?.map((role) => (
                  <div key={role.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={role.id} id={role.id} />
                    <Label htmlFor={role.id} className="flex-1 cursor-pointer">
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
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex-1 cursor-pointer" onClick={() => setUseCustomPermissions(true)}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Custom Permissions</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Select specific permissions below</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Custom Permissions */}
            {(useCustomPermissions || selectedRoleId === 'custom') && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base">Select Permissions</Label>
                  <div className="border rounded-lg">
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="px-4 text-sm font-medium capitalize hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <span>{category}</span>
                              <Badge variant="secondary" className="text-xs">
                                {permissions.filter(p => selectedPermissions.includes(p.id)).length}/{permissions.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3">
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
                                    <Label htmlFor={perm.id} className="cursor-pointer text-sm">
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
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
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
            onClick={() => promoteMutation.mutate()}
            disabled={
              (!selectedRoleId && !useCustomPermissions) ||
              (useCustomPermissions && selectedPermissions.length === 0) ||
              promoteMutation.isPending
            }
          >
            Promote to Admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
