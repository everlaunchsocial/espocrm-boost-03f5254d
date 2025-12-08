import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAllCustomersBilling } from '@/hooks/useCustomerBilling';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Users, DollarSign, Phone, AlertTriangle } from 'lucide-react';

export default function AdminCustomerUsage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { data: customers, isLoading } = useAllCustomersBilling();
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [overageFilter, setOverageFilter] = useState<string>('all');

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredCustomers = customers?.filter(c => {
    if (planFilter !== 'all' && c.plan_code !== planFilter) return false;
    if (overageFilter === 'has-overage' && (c.overage_minutes || 0) <= 0) return false;
    if (overageFilter === 'no-overage' && (c.overage_minutes || 0) > 0) return false;
    return true;
  }) || [];

  // Summary stats
  const totalCustomers = customers?.length || 0;
  const totalMinutesUsed = customers?.reduce((sum, c) => sum + (c.total_minutes_used || 0), 0) || 0;
  const totalEstimatedRevenue = customers?.reduce((sum, c) => sum + (c.total_estimated_cost || 0), 0) || 0;
  const customersWithOverage = customers?.filter(c => (c.overage_minutes || 0) > 0).length || 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-8">Customer Usage Overview</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes Used</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMinutesUsed.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Est. Revenue (This Cycle)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEstimatedRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customers w/ Overage</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customersWithOverage}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="w-48">
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={overageFilter} onValueChange={setOverageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by overage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="has-overage">Has Overage</SelectItem>
              <SelectItem value="no-overage">No Overage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8">
              <Skeleton className="h-64" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No customers found matching filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Monthly Price</TableHead>
                  <TableHead className="text-right">Minutes Included</TableHead>
                  <TableHead className="text-right">Minutes Used</TableHead>
                  <TableHead className="text-right">Overage Mins</TableHead>
                  <TableHead className="text-right">Overage Cost</TableHead>
                  <TableHead className="text-right">Est. Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const hasOverage = (customer.overage_minutes || 0) > 0;
                  return (
                    <TableRow key={customer.customer_id}>
                      <TableCell className="font-mono text-xs">
                        {customer.customer_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.plan_name || 'None'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${customer.monthly_price || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.minutes_included || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {(customer.total_minutes_used || 0).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasOverage ? (
                          <span className="text-destructive font-medium">
                            {(customer.overage_minutes || 0).toFixed(1)}
                          </span>
                        ) : (
                          '0'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasOverage ? (
                          <span className="text-destructive font-medium">
                            ${(customer.overage_cost || 0).toFixed(2)}
                          </span>
                        ) : (
                          '$0.00'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(customer.total_estimated_cost || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
