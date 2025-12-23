import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DollarSign, CreditCard, TrendingUp, Users, FileText, Clock, CheckCircle, AlertCircle, Plus, RefreshCw, Target, Pause, X } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { useBillingStats, useSubscriptions, useCommissions, useRevenueTargets, useAddSubscription, useUpdateSubscription, useUpdateCommission, useAddRevenueTarget } from '@/hooks/useBilling';
import { useLeads } from '@/hooks/useCRMData';


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

function StatsCards() {
  const { data: stats, isLoading } = useBillingStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-32" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Invoiced (Month)</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats?.invoiced || 0)}</div>
          <p className="text-xs text-muted-foreground">This month total</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue (Paid)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats?.paid || 0)}</div>
          <p className="text-xs text-muted-foreground">Collected this month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats?.due || 0)}</div>
          {(stats?.overdue || 0) > 0 && (
            <p className="text-xs text-destructive">{formatCurrency(stats?.overdue || 0)} overdue</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">MRR</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats?.mrr || 0)}</div>
          <p className="text-xs text-muted-foreground">ARR: {formatCurrency(stats?.arr || 0)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoicesTab() {
  const { data: invoices, isLoading } = useInvoices();

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recent Invoices</h3>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
      </div>
      <div className="space-y-3">
        {(invoices || []).slice(0, 10).map((invoice) => (
          <Card key={invoice.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium">{invoice.invoiceNumber}</span>
                  <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{invoice.customerName}</p>
                {invoice.dueDate && (
                  <p className="text-xs text-muted-foreground">Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{formatCurrency(invoice.totalAmount)}</p>
                {invoice.amountPaid > 0 && invoice.amountPaid < invoice.totalAmount && (
                  <p className="text-xs text-muted-foreground">Paid: {formatCurrency(invoice.amountPaid)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {(!invoices || invoices.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-2" />
              <p>No invoices yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SubscriptionsTab() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const updateSubscription = useUpdateSubscription();
  const addSubscription = useAddSubscription();
  const { data: leads } = useLeads();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customerId: '', planName: '', planAmount: '', billingCycle: 'monthly' });

  const handleAdd = async () => {
    if (!form.customerId || !form.planName || !form.planAmount) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await addSubscription.mutateAsync({
        customerId: form.customerId,
        planName: form.planName,
        planAmount: parseFloat(form.planAmount),
        billingCycle: form.billingCycle,
        startDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Subscription created');
      setShowAdd(false);
      setForm({ customerId: '', planName: '', planAmount: '', billingCycle: 'monthly' });
    } catch {
      toast.error('Failed to create subscription');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateSubscription.mutateAsync({ id, status });
      toast.success(`Subscription ${status}`);
    } catch {
      toast.error('Failed to update subscription');
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  const activeCount = (subscriptions || []).filter((s) => s.status === 'active').length;
  const mrr = (subscriptions || [])
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => {
      switch (s.billingCycle) {
        case 'monthly': return sum + s.planAmount;
        case 'quarterly': return sum + s.planAmount / 3;
        case 'annually': return sum + s.planAmount / 12;
        default: return sum + s.planAmount;
      }
    }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Active Subscriptions ({activeCount})</h3>
          <p className="text-sm text-muted-foreground">MRR: {formatCurrency(mrr)} • ARR: {formatCurrency(mrr * 12)}</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Subscription</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Subscription</DialogTitle>
              <DialogDescription>Add a new recurring subscription</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {(leads || []).map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>{lead.company || `${lead.firstName} ${lead.lastName}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} placeholder="e.g. Pro Plan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" value={form.planAmount} onChange={(e) => setForm({ ...form, planAmount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select value={form.billingCycle} onValueChange={(v) => setForm({ ...form, billingCycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={addSubscription.isPending}>
                {addSubscription.isPending ? 'Creating...' : 'Create Subscription'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {(subscriptions || []).map((sub) => (
          <Card key={sub.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{sub.customerName || 'Unknown Customer'}</span>
                  <Badge className={statusColors[sub.status]}>{sub.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {sub.planName} • {formatCurrency(sub.planAmount)}/{sub.billingCycle}
                </p>
                {sub.nextBillingDate && (
                  <p className="text-xs text-muted-foreground">Next billing: {format(new Date(sub.nextBillingDate), 'MMM d, yyyy')}</p>
                )}
              </div>
              <div className="flex gap-2">
                {sub.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(sub.id, 'paused')}>
                    <Pause className="h-4 w-4" />
                  </Button>
                )}
                {sub.status === 'paused' && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(sub.id, 'active')}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                {sub.status !== 'cancelled' && (
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleStatusChange(sub.id, 'cancelled')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {(!subscriptions || subscriptions.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mb-2" />
              <p>No subscriptions yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CommissionsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: commissions, isLoading } = useCommissions(statusFilter || undefined);
  const updateCommission = useUpdateCommission();
  const { data: stats } = useBillingStats();

  const handleApprove = async (id: string) => {
    try {
      const { data: user } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
      await updateCommission.mutateAsync({ id, status: 'approved', approvedBy: user.user?.id });
      toast.success('Commission approved');
    } catch {
      toast.error('Failed to approve commission');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await updateCommission.mutateAsync({ id, status: 'paid' });
      toast.success('Commission marked as paid');
    } catch {
      toast.error('Failed to update commission');
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats?.pendingCommissions || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Approved</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency((stats?.totalCommissions || 0) - (stats?.pendingCommissions || 0) - (stats?.paidCommissions || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Paid</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats?.paidCommissions || 0)}</div></CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Commission Records</h3>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {(commissions || []).map((comm) => (
          <Card key={comm.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{comm.dealName || 'Deal'}</span>
                  <Badge className={statusColors[comm.status]}>{comm.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Deal: {formatCurrency(comm.dealAmount)} • Rate: {(comm.commissionRate * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">{format(new Date(comm.createdAt), 'MMM d, yyyy')}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(comm.commissionAmount)}</p>
                </div>
                <div className="flex gap-2">
                  {comm.status === 'pending' && (
                    <Button size="sm" onClick={() => handleApprove(comm.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" />Approve
                    </Button>
                  )}
                  {comm.status === 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => handleMarkPaid(comm.id)}>
                      <DollarSign className="h-4 w-4 mr-1" />Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!commissions || commissions.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mb-2" />
              <p>No commissions recorded</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function RevenueTab() {
  const { data: targets, isLoading } = useRevenueTargets('monthly');
  const addTarget = useAddRevenueTarget();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ targetAmount: '', periodType: 'monthly' });

  const handleAdd = async () => {
    if (!form.targetAmount) {
      toast.error('Please enter target amount');
      return;
    }
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    try {
      await addTarget.mutateAsync({
        targetType: 'organization',
        periodType: form.periodType,
        periodStart,
        periodEnd,
        targetAmount: parseFloat(form.targetAmount),
      });
      toast.success('Target created');
      setShowAdd(false);
      setForm({ targetAmount: '', periodType: 'monthly' });
    } catch {
      toast.error('Failed to create target');
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Revenue Targets</h3>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Set Target</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Revenue Target</DialogTitle>
              <DialogDescription>Create a new revenue target</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={form.periodType} onValueChange={(v) => setForm({ ...form, periodType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={addTarget.isPending}>
                {addTarget.isPending ? 'Creating...' : 'Create Target'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {(targets || []).map((target) => {
          const percentage = target.targetAmount > 0 ? (target.currentAmount / target.targetAmount) * 100 : 0;
          const remaining = Math.max(0, target.targetAmount - target.currentAmount);
          return (
            <Card key={target.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="font-medium capitalize">{target.periodType} Target</span>
                  </div>
                  <Badge variant={percentage >= 100 ? 'default' : percentage >= 75 ? 'secondary' : 'outline'}>
                    {percentage.toFixed(0)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Goal: {formatCurrency(target.targetAmount)}</span>
                    <span>Current: {formatCurrency(target.currentAmount)}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {remaining > 0 ? `${formatCurrency(remaining)} remaining` : 'Target achieved!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!targets || targets.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mb-2" />
              <p>No revenue targets set</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function BillingDashboard() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Revenue</h1>
          <p className="text-muted-foreground">Manage invoices, subscriptions, and commissions</p>
        </div>
      </div>

      <StatsCards />

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-2" />Invoices</TabsTrigger>
          <TabsTrigger value="subscriptions"><RefreshCw className="h-4 w-4 mr-2" />Subscriptions</TabsTrigger>
          <TabsTrigger value="commissions"><DollarSign className="h-4 w-4 mr-2" />Commissions</TabsTrigger>
          <TabsTrigger value="revenue"><TrendingUp className="h-4 w-4 mr-2" />Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
        <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
        <TabsContent value="commissions"><CommissionsTab /></TabsContent>
        <TabsContent value="revenue"><RevenueTab /></TabsContent>
      </Tabs>
    </div>
  );
}
