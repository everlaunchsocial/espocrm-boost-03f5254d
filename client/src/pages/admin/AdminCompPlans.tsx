import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Loader2,
  CheckCircle,
  Percent
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CommissionPlan {
  id: string;
  name: string;
  level1_rate: number;
  level2_rate: number;
  level3_rate: number;
  is_default: boolean;
  created_at: string;
}

function useCommissionPlans() {
  return useQuery({
    queryKey: ['commission-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_plans')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as CommissionPlan[];
    },
  });
}

function PlanFormModal({ 
  plan, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  plan?: CommissionPlan; 
  isOpen: boolean; 
  onClose: () => void;
  onSave: (data: Partial<CommissionPlan>) => Promise<void>;
}) {
  const [name, setName] = useState(plan?.name || '');
  const [level1, setLevel1] = useState((plan?.level1_rate || 0.3) * 100);
  const [level2, setLevel2] = useState((plan?.level2_rate || 0.15) * 100);
  const [level3, setLevel3] = useState((plan?.level3_rate || 0.05) * 100);
  const [isDefault, setIsDefault] = useState(plan?.is_default || false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const totalPayout = level1 + level2 + level3;
  const isValid = totalPayout <= 100 && name.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: 'Total payout cannot exceed 100%',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        level1_rate: level1 / 100,
        level2_rate: level2 / 100,
        level3_rate: level3 / 100,
        is_default: isDefault,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit' : 'Create'} Compensation Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Investor Plan"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level1">Level 1 (%)</Label>
              <Input
                id="level1"
                type="number"
                min="0"
                max="100"
                value={level1}
                onChange={(e) => setLevel1(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level2">Level 2 (%)</Label>
              <Input
                id="level2"
                type="number"
                min="0"
                max="100"
                value={level2}
                onChange={(e) => setLevel2(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level3">Level 3 (%)</Label>
              <Input
                id="level3"
                type="number"
                min="0"
                max="100"
                value={level3}
                onChange={(e) => setLevel3(Number(e.target.value))}
              />
            </div>
          </div>

          <div className={`p-3 rounded-lg ${totalPayout > 100 ? 'bg-destructive/10' : 'bg-muted'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Payout:</span>
              <span className={`font-bold ${totalPayout > 100 ? 'text-destructive' : ''}`}>
                {totalPayout}%
              </span>
            </div>
            {totalPayout > 100 && (
              <p className="text-sm text-destructive mt-1">
                Total cannot exceed 100%
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isDefault">Set as Default Plan</Label>
              <p className="text-sm text-muted-foreground">
                New affiliates will use this plan
              </p>
            </div>
            <Switch
              id="isDefault"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {plan ? 'Save Changes' : 'Create Plan'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCompPlans() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useCommissionPlans();
  
  const [editingPlan, setEditingPlan] = useState<CommissionPlan | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createPlan = useMutation({
    mutationFn: async (data: Partial<CommissionPlan>) => {
      const { error } = await supabase.from('commission_plans').insert([{
        name: data.name!,
        level1_rate: data.level1_rate,
        level2_rate: data.level2_rate,
        level3_rate: data.level3_rate,
        is_default: data.is_default,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-plans'] });
      toast({ title: 'Plan Created', description: 'Compensation plan created successfully.' });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CommissionPlan> & { id: string }) => {
      const { error } = await supabase
        .from('commission_plans')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-plans'] });
      toast({ title: 'Plan Updated', description: 'Compensation plan updated successfully.' });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('commission_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-plans'] });
      toast({ title: 'Plan Deleted', description: 'Compensation plan deleted.' });
    },
  });

  if (roleLoading || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium">Access Denied</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          You must be an admin to access this page.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compensation Plans</h1>
          <p className="text-muted-foreground">Manage affiliate commission structures</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            All Compensation Plans
          </CardTitle>
          <CardDescription>
            Commission rates for each tier of affiliate earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No Plans Yet</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Create your first compensation plan to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead className="text-center">Level 1</TableHead>
                  <TableHead className="text-center">Level 2</TableHead>
                  <TableHead className="text-center">Level 3</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const total = (plan.level1_rate + plan.level2_rate + plan.level3_rate) * 100;
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-center">{(plan.level1_rate * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-center">{(plan.level2_rate * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-center">{(plan.level3_rate * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-center font-bold">{total.toFixed(0)}%</TableCell>
                      <TableCell>
                        {plan.is_default ? (
                          <Badge variant="default">Default</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(plan.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingPlan(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Delete this plan?')) {
                                deletePlan.mutate(plan.id);
                              }
                            }}
                            disabled={plan.is_default}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <PlanFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={async (data) => {
          await createPlan.mutateAsync(data as any);
        }}
      />

      {/* Edit Modal */}
      {editingPlan && (
        <PlanFormModal
          plan={editingPlan}
          isOpen={!!editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={async (data) => {
            await updatePlan.mutateAsync({ id: editingPlan.id, ...data });
          }}
        />
      )}
    </div>
  );
}
