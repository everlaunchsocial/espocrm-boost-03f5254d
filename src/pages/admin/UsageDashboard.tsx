import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CRMLayout } from '@/components/crm/CRMLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { useServiceUsageSummary, useActiveAlerts, acknowledgeAlert, resolveAlert } from '@/hooks/useServiceUsage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Clock, 
  MessageSquare, 
  AlertTriangle, 
  Users, 
  Building2, 
  TrendingUp,
  Check,
  Eye
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function UsageDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading, userId } = useUserRole();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Date range for current month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: summary, isLoading: summaryLoading } = useServiceUsageSummary(monthStart, monthEnd);
  const { data: alerts, isLoading: alertsLoading } = useActiveAlerts();

  // Fetch affiliate usage summary
  const { data: affiliateUsage } = useQuery({
    queryKey: ['affiliate-usage-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_usage')
        .select(`
          affiliate_id,
          cost_usd,
          affiliates!inner(username)
        `)
        .not('affiliate_id', 'is', null)
        .gte('created_at', monthStart.toISOString());

      if (error) throw error;

      // Aggregate by affiliate
      const byAffiliate: Record<string, { username: string; cost: number; count: number }> = {};
      for (const row of data || []) {
        const id = row.affiliate_id!;
        if (!byAffiliate[id]) {
          const affiliateData = row.affiliates as { username: string } | null;
          byAffiliate[id] = { 
            username: affiliateData?.username || 'Unknown', 
            cost: 0, 
            count: 0 
          };
        }
        byAffiliate[id].cost += Number(row.cost_usd) || 0;
        byAffiliate[id].count += 1;
      }

      return Object.entries(byAffiliate).map(([id, data]) => ({
        affiliate_id: id,
        ...data
      })).sort((a, b) => b.cost - a.cost);
    }
  });

  // Fetch customer usage with COGS
  const { data: customerUsage } = useQuery({
    queryKey: ['customer-usage-summary'],
    queryFn: async () => {
      const { data: customers, error: custError } = await supabase
        .from('customer_profiles')
        .select(`
          id,
          business_name,
          minutes_used,
          minutes_included,
          customer_plan_id,
          customer_plans(name, monthly_price)
        `);

      if (custError) throw custError;

      const { data: usage, error: usageError } = await supabase
        .from('service_usage')
        .select('customer_id, cost_usd')
        .not('customer_id', 'is', null)
        .eq('call_type', 'customer')
        .gte('created_at', monthStart.toISOString());

      if (usageError) throw usageError;

      // Aggregate costs by customer
      const costByCustomer: Record<string, number> = {};
      for (const row of usage || []) {
        const id = row.customer_id!;
        costByCustomer[id] = (costByCustomer[id] || 0) + (Number(row.cost_usd) || 0);
      }

      return (customers || []).map(c => {
        const planData = c.customer_plans as { name: string; monthly_price: number } | null;
        const revenue = Number(planData?.monthly_price) || 0;
        const cogs = costByCustomer[c.id] || 0;
        const margin = revenue - cogs;
        const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

        return {
          customer_id: c.id,
          business_name: c.business_name || 'Unknown',
          plan_name: planData?.name || 'No Plan',
          revenue,
          cogs,
          margin,
          margin_percent: marginPercent,
          minutes_used: c.minutes_used || 0,
          minutes_included: c.minutes_included || 0
        };
      }).sort((a, b) => b.cogs - a.cogs);
    }
  });

  // Fetch monthly trends
  const { data: monthlyTrends } = useQuery({
    queryKey: ['usage-monthly-trends'],
    queryFn: async () => {
      const months: Array<{ month: string; cost: number; minutes: number; messages: number }> = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const { data, error } = await supabase
          .from('service_usage')
          .select('cost_usd, duration_seconds, message_count')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (error) throw error;

        let cost = 0, minutes = 0, messages = 0;
        for (const row of data || []) {
          cost += Number(row.cost_usd) || 0;
          minutes += (row.duration_seconds || 0) / 60;
          messages += row.message_count || 0;
        }

        months.push({
          month: format(monthDate, 'MMM yyyy'),
          cost,
          minutes: Math.round(minutes),
          messages
        });
      }

      return months;
    }
  });

  const handleAcknowledge = async (alertId: string) => {
    if (!userId) return;
    try {
      await acknowledgeAlert(alertId, userId);
      queryClient.invalidateQueries({ queryKey: ['usage-alerts-active'] });
      toast.success('Alert acknowledged');
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    if (!userId) return;
    try {
      await resolveAlert(alertId, userId);
      queryClient.invalidateQueries({ queryKey: ['usage-alerts-active'] });
      toast.success('Alert resolved');
    } catch {
      toast.error('Failed to resolve alert');
    }
  };

  if (roleLoading) {
    return (
      <CRMLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage & COGS Dashboard</h1>
          <p className="text-muted-foreground">Monitor AI usage, costs, and margins across all services</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost (This Month)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryLoading ? <Skeleton className="h-8 w-24" /> : `$${(summary?.total_cost || 0).toFixed(2)}`}
                  </div>
                  <p className="text-xs text-muted-foreground">All AI services combined</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Voice Minutes</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryLoading ? <Skeleton className="h-8 w-24" /> : Math.round((summary?.total_duration_seconds || 0) / 60)}
                  </div>
                  <p className="text-xs text-muted-foreground">Phone + Web voice</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chat Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryLoading ? <Skeleton className="h-8 w-24" /> : summary?.total_messages || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Web chat sessions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {alertsLoading ? <Skeleton className="h-8 w-24" /> : alerts?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>
            </div>

            {/* By Provider Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-24" />
                ) : (
                  <div className="space-y-2">
                    {Object.entries(summary?.by_provider || {}).map(([provider, data]) => (
                      <div key={provider} className="flex justify-between items-center">
                        <span className="capitalize">{provider.replace('_', ' ')}</span>
                        <div className="text-right">
                          <span className="font-medium">${data.cost.toFixed(2)}</span>
                          <span className="text-muted-foreground text-sm ml-2">({data.count} sessions)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Usage Type */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Usage Type</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-24" />
                ) : (
                  <div className="space-y-2">
                    {Object.entries(summary?.by_usage_type || {}).map(([type, data]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <div className="text-right">
                          <span className="font-medium">${data.cost.toFixed(2)}</span>
                          <span className="text-muted-foreground text-sm ml-2">({data.count} sessions)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AFFILIATES TAB */}
          <TabsContent value="affiliates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Affiliate Usage (This Month)
                </CardTitle>
                <CardDescription>Demo costs by affiliate</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(affiliateUsage || []).map(aff => (
                      <TableRow key={aff.affiliate_id}>
                        <TableCell className="font-medium">{aff.username}</TableCell>
                        <TableCell className="text-right">{aff.count}</TableCell>
                        <TableCell className="text-right">${aff.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {!affiliateUsage?.length && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No affiliate usage this month
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CUSTOMERS TAB */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Customer COGS & Margins (This Month)
                </CardTitle>
                <CardDescription>Revenue vs AI costs per customer</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customerUsage || []).map(cust => (
                      <TableRow key={cust.customer_id}>
                        <TableCell className="font-medium">{cust.business_name}</TableCell>
                        <TableCell>{cust.plan_name}</TableCell>
                        <TableCell className="text-right">${cust.revenue.toFixed(0)}</TableCell>
                        <TableCell className="text-right">${cust.cogs.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cust.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${cust.margin.toFixed(2)} ({cust.margin_percent.toFixed(0)}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {cust.minutes_used}/{cust.minutes_included} min
                        </TableCell>
                      </TableRow>
                    ))}
                    {!customerUsage?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No customer usage this month
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ALERTS TAB */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active Alerts
                </CardTitle>
                <CardDescription>Usage and spam alerts requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(alerts || []).map(alert => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge variant={alert.alert_type.includes('spam') ? 'destructive' : 'secondary'}>
                            {alert.alert_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{alert.message}</TableCell>
                        <TableCell>{format(new Date(alert.created_at), 'MMM d, h:mm a')}</TableCell>
                        <TableCell>
                          {alert.acknowledged_at ? (
                            <Badge variant="outline">Acknowledged</Badge>
                          ) : (
                            <Badge variant="secondary">New</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {!alert.acknowledged_at && (
                            <Button size="sm" variant="outline" onClick={() => handleAcknowledge(alert.id)}>
                              <Eye className="h-4 w-4 mr-1" /> Ack
                            </Button>
                          )}
                          <Button size="sm" variant="default" onClick={() => handleResolve(alert.id)}>
                            <Check className="h-4 w-4 mr-1" /> Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!alerts?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No active alerts
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  6-Month Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Minutes</TableHead>
                      <TableHead className="text-right">Messages</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(monthlyTrends || []).map(trend => (
                      <TableRow key={trend.month}>
                        <TableCell className="font-medium">{trend.month}</TableCell>
                        <TableCell className="text-right">${trend.cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{trend.minutes}</TableCell>
                        <TableCell className="text-right">{trend.messages}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
