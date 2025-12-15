import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CRMLayout } from '@/components/crm/CRMLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  Edit, 
  FileText, 
  RefreshCw,
  PiggyBank,
  Calendar
} from 'lucide-react';

interface ExpenseService {
  id: string;
  service_name: string;
  category: string;
  pricing_model: string;
  base_cost: number;
  current_plan: string | null;
  status: string;
  cost_attribution: string;
  primary_purpose: string | null;
  cancellation_impact: string | null;
  billing_portal_url: string | null;
  notes: string | null;
  last_reviewed_at: string | null;
}

interface ExpenseMonthly {
  id: string;
  service_id: string;
  month: string;
  budgeted_amount: number | null;
  actual_amount: number | null;
  is_overdue: boolean;
}

export default function ExpensesDashboard() {
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState<ExpenseService | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<{ service: ExpenseService } | null>(null);
  const [invoiceData, setInvoiceData] = useState({ actual_amount: '', is_overdue: false, invoice_url: '' });

  // Get current month as YYYY-MM-01
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  // Fetch services with current month expenses
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['expenses-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses_services')
        .select('*')
        .order('service_name');
      if (error) throw error;
      return data as ExpenseService[];
    }
  });

  // Fetch current month expenses
  const { data: monthlyExpenses } = useQuery({
    queryKey: ['expenses-monthly', currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses_monthly')
        .select('*')
        .eq('month', currentMonth);
      if (error) throw error;
      return data as ExpenseMonthly[];
    }
  });

  // Fetch 6-month trend data
  const { data: trendData } = useQuery({
    queryKey: ['expenses-trend'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const startMonth = sixMonthsAgo.toISOString().slice(0, 7) + '-01';
      
      const { data, error } = await supabase
        .from('expenses_monthly')
        .select('month, actual_amount')
        .gte('month', startMonth)
        .order('month');
      if (error) throw error;
      
      // Group by month
      const grouped: Record<string, number> = {};
      for (const row of data || []) {
        const month = row.month;
        grouped[month] = (grouped[month] || 0) + (row.actual_amount || 0);
      }
      return grouped;
    }
  });

  // Fetch redundancy alerts
  const { data: alerts } = useQuery({
    queryKey: ['expense-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_alerts')
        .select('*')
        .eq('alert_type', 'service_redundant')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Calculate summary metrics
  const monthlyBudget = services?.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + s.base_cost, 0) || 0;
  const monthlyActuals = monthlyExpenses?.reduce((sum, e) => sum + (e.actual_amount || 0), 0) || 0;
  const overdueCount = monthlyExpenses?.filter(e => e.is_overdue).length || 0;
  const potentialSavings = services?.filter(s => s.status === 'redundant').reduce((sum, s) => sum + s.base_cost, 0) || 0;

  // Update service mutation
  const updateService = useMutation({
    mutationFn: async (service: Partial<ExpenseService> & { id: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('expenses-upsert', {
        body: service,
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Service updated');
      queryClient.invalidateQueries({ queryKey: ['expenses-services'] });
      setEditingService(null);
    },
    onError: (error: Error) => toast.error(error.message)
  });

  // Record invoice mutation
  const recordInvoice = useMutation({
    mutationFn: async (data: { service_id: string; month: string; actual_amount: number; is_overdue: boolean; invoice_url?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('expenses-monthly-upsert', {
        body: data,
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Invoice recorded');
      queryClient.invalidateQueries({ queryKey: ['expenses-monthly'] });
      setInvoiceModal(null);
      setInvoiceData({ actual_amount: '', is_overdue: false, invoice_url: '' });
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'review_needed': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Review Needed</Badge>;
      case 'redundant': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Redundant</Badge>;
      case 'cancelled': return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAttributionBadge = (attr: string) => {
    const colors: Record<string, string> = {
      platform: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      acquisition: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      delivery: 'bg-green-500/20 text-green-400 border-green-500/30',
      development: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    };
    return <Badge className={colors[attr] || 'bg-gray-500/20'}>{attr}</Badge>;
  };

  if (servicesLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Company Expenses</h1>
          <p className="text-muted-foreground">Track and manage all platform expenses and tool subscriptions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${monthlyBudget.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Sum of active service costs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Actuals</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${monthlyActuals.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Recorded this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
              <PiggyBank className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">${potentialSavings.toFixed(2)}/mo</div>
              <p className="text-xs text-muted-foreground">From redundant services</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Panel */}
        {alerts && alerts.length > 0 && (
          <Card className="border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                Redundancy Alerts
              </CardTitle>
              <CardDescription>Services with no usage detected in last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground">
                        Potential annual savings: ${((alert.metadata?.potential_annual_savings) || 0).toFixed(2)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Review</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Table */}
        <Card>
          <CardHeader>
            <CardTitle>Services ({services?.length || 0})</CardTitle>
            <CardDescription>All tracked tools and subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Base Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attribution</TableHead>
                  <TableHead>This Month</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((service) => {
                  const monthlyRecord = monthlyExpenses?.find(e => e.service_id === service.id);
                  return (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="font-medium">{service.service_name}</div>
                        <div className="text-xs text-muted-foreground">{service.pricing_model}</div>
                      </TableCell>
                      <TableCell>{service.category}</TableCell>
                      <TableCell>{service.current_plan || '-'}</TableCell>
                      <TableCell>${service.base_cost.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(service.status)}</TableCell>
                      <TableCell>{getAttributionBadge(service.cost_attribution)}</TableCell>
                      <TableCell>
                        {monthlyRecord ? (
                          <div className="flex items-center gap-2">
                            <span>${(monthlyRecord.actual_amount || 0).toFixed(2)}</span>
                            {monthlyRecord.is_overdue && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditingService(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setInvoiceModal({ service });
                              setInvoiceData({
                                actual_amount: service.base_cost.toString(),
                                is_overdue: false,
                                invoice_url: ''
                              });
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {service.billing_portal_url && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => window.open(service.billing_portal_url!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 6-Month Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              6-Month Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData && Object.keys(trendData).length > 0 ? (
              <div className="flex items-end gap-4 h-40">
                {Object.entries(trendData).sort().map(([month, total]) => {
                  const maxValue = Math.max(...Object.values(trendData));
                  const height = maxValue > 0 ? (total / maxValue) * 100 : 0;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-primary/60 rounded-t transition-all"
                        style={{ height: `${height}%`, minHeight: total > 0 ? '10px' : '2px' }}
                      />
                      <div className="text-xs text-muted-foreground">{month.slice(0, 7)}</div>
                      <div className="text-xs font-medium">${total.toFixed(0)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No trend data available. Record invoices to see spending history.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Service Modal */}
        <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Service: {editingService?.service_name}</DialogTitle>
              <DialogDescription>Update service details and status</DialogDescription>
            </DialogHeader>
            {editingService && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editingService.status} 
                      onValueChange={(v) => setEditingService({ ...editingService, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="review_needed">Review Needed</SelectItem>
                        <SelectItem value="redundant">Redundant</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Cost</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={editingService.base_cost} 
                      onChange={(e) => setEditingService({ ...editingService, base_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Plan</Label>
                  <Input 
                    value={editingService.current_plan || ''} 
                    onChange={(e) => setEditingService({ ...editingService, current_plan: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cost Attribution</Label>
                  <Select 
                    value={editingService.cost_attribution} 
                    onValueChange={(v) => setEditingService({ ...editingService, cost_attribution: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Platform</SelectItem>
                      <SelectItem value="acquisition">Acquisition</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Billing Portal URL</Label>
                  <Input 
                    value={editingService.billing_portal_url || ''} 
                    onChange={(e) => setEditingService({ ...editingService, billing_portal_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={editingService.notes || ''} 
                    onChange={(e) => setEditingService({ ...editingService, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingService(null)}>Cancel</Button>
              <Button 
                onClick={() => editingService && updateService.mutate(editingService)}
                disabled={updateService.isPending}
              >
                {updateService.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Record Invoice Modal */}
        <Dialog open={!!invoiceModal} onOpenChange={() => setInvoiceModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Invoice: {invoiceModal?.service.service_name}</DialogTitle>
              <DialogDescription>Record payment details for current month</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Actual Amount</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={invoiceData.actual_amount} 
                  onChange={(e) => setInvoiceData({ ...invoiceData, actual_amount: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="is_overdue"
                  checked={invoiceData.is_overdue}
                  onChange={(e) => setInvoiceData({ ...invoiceData, is_overdue: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_overdue">Mark as Overdue</Label>
              </div>

              <div className="space-y-2">
                <Label>Invoice URL (optional)</Label>
                <Input 
                  value={invoiceData.invoice_url} 
                  onChange={(e) => setInvoiceData({ ...invoiceData, invoice_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInvoiceModal(null)}>Cancel</Button>
              <Button 
                onClick={() => invoiceModal && recordInvoice.mutate({
                  service_id: invoiceModal.service.id,
                  month: currentMonth,
                  actual_amount: parseFloat(invoiceData.actual_amount) || 0,
                  is_overdue: invoiceData.is_overdue,
                  invoice_url: invoiceData.invoice_url || undefined
                })}
                disabled={recordInvoice.isPending}
              >
                {recordInvoice.isPending ? 'Saving...' : 'Record Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CRMLayout>
  );
}
