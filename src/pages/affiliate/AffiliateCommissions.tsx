import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, CheckCircle, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  useAffiliateCommissions,
  useCommissionSummary,
  CommissionStatus,
  DateRange,
  CommissionRow,
} from '@/hooks/useAffiliateCommissions';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { useAffiliatePayouts, PayoutRow } from '@/hooks/usePayouts';
import { EarningsDisclaimer } from '@/components/EarningsDisclaimer';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function CommissionLevelBadge({ level }: { level: number }) {
  const config = {
    1: { label: 'Level 1 (30%)', variant: 'default' as const },
    2: { label: 'Level 2 (15%)', variant: 'secondary' as const },
    3: { label: 'Level 3 (5%)', variant: 'outline' as const },
  };
  const { label, variant } = config[level as keyof typeof config] || { label: `Level ${level}`, variant: 'outline' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>;
  }
  return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
}

function SummaryCards() {
  const { data: summary, isLoading } = useCommissionSummary();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending (This Month)</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary?.pendingThisMonth || 0)}</div>
          <p className="text-xs text-muted-foreground">Awaiting payout period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid (This Month)</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary?.paidThisMonth || 0)}</div>
          <p className="text-xs text-muted-foreground">Received this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lifetime Earned</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary?.lifetimeEarned || 0)}</div>
          <p className="text-xs text-muted-foreground">Total paid out</p>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Est. Annual (12-mo)</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">
            {formatCurrency(summary?.projectedAnnual || 0)}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Estimate only, not guaranteed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CommissionsTable({
  commissions,
  isLoading,
  showLevel = true,
}: {
  commissions: CommissionRow[];
  isLoading: boolean;
  showLevel?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No commissions found</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          Adjust your filters or close your first sale to start earning commissions!
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          {showLevel && <TableHead>Level</TableHead>}
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {commissions.map((commission) => (
          <TableRow key={commission.id}>
            <TableCell>{format(commission.createdAt, 'MMM d, yyyy')}</TableCell>
            <TableCell className="font-mono text-xs">
              {commission.customerId.slice(0, 8)}...
            </TableCell>
            {showLevel && (
              <TableCell>
                <CommissionLevelBadge level={commission.commissionLevel} />
              </TableCell>
            )}
            <TableCell className="text-right font-medium">
              {formatCurrency(commission.amount)}
            </TableCell>
            <TableCell>
              <StatusBadge status={commission.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TeamLevelCards() {
  const { data: summary, isLoading } = useCommissionSummary();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const levels = [
    { level: 1, label: 'Level 1 (Personal Sales)', rate: '30%', data: summary?.byLevel.level1 },
    { level: 2, label: 'Level 2 (Direct Recruits)', rate: '15%', data: summary?.byLevel.level2 },
    { level: 3, label: 'Level 3 (2nd Gen Recruits)', rate: '5%', data: summary?.byLevel.level3 },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      {levels.map(({ level, label, rate, data }) => (
        <Card key={level}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <CardDescription>{rate} commission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.total || 0)}</div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-yellow-600 dark:text-yellow-400">
                Pending: {formatCurrency(data?.pending || 0)}
              </span>
              <span className="text-green-600 dark:text-green-400">
                Paid: {formatCurrency(data?.paid || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FilterControls({
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
}: {
  statusFilter: CommissionStatus;
  setStatusFilter: (s: CommissionStatus) => void;
  dateRange: DateRange;
  setDateRange: (d: DateRange) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CommissionStatus)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Period:</span>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function PersonalTab() {
  const [statusFilter, setStatusFilter] = useState<CommissionStatus>('pending');
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  
  const { data: commissions = [], isLoading } = useAffiliateCommissions(statusFilter, dateRange);
  
  // Filter to only level 1 (personal sales)
  const personalCommissions = commissions.filter((c) => c.commissionLevel === 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Personal Commissions (Tier 1 - 30%)
        </CardTitle>
        <CardDescription>
          Commissions earned from your direct sales
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FilterControls
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
        <CommissionsTable
          commissions={personalCommissions}
          isLoading={isLoading}
          showLevel={false}
        />
      </CardContent>
    </Card>
  );
}

function TeamTab() {
  const [statusFilter, setStatusFilter] = useState<CommissionStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  
  const { data: commissions = [], isLoading } = useAffiliateCommissions(statusFilter, dateRange);
  
  // Filter to levels 2 and 3 (team sales)
  const teamCommissions = commissions.filter((c) => c.commissionLevel > 1);

  return (
    <>
      <TeamLevelCards />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Commissions (Tier 2: 15%, Tier 3: 5%)
          </CardTitle>
          <CardDescription>
            Commissions earned from your recruited team's sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FilterControls
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
          <CommissionsTable
            commissions={teamCommissions}
            isLoading={isLoading}
            showLevel={true}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function AffiliateCommissions() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();

  if (affiliateLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!affiliateId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium">Affiliate Account Required</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          You need to be registered as an affiliate to view commissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Commissions</h1>
        <p className="text-muted-foreground">Track your earnings from personal and team sales</p>
      </div>

      <EarningsDisclaimer variant="card" />

      <SummaryCards />

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Sales</TabsTrigger>
          <TabsTrigger value="team">Team Sales</TabsTrigger>
          <TabsTrigger value="payouts">Payout History</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalTab />
        </TabsContent>

        <TabsContent value="team">
          <TeamTab />
        </TabsContent>

        <TabsContent value="payouts">
          <PayoutsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PayoutsTab() {
  const { data: payouts = [], isLoading } = useAffiliatePayouts();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Your Payout History
        </CardTitle>
        <CardDescription>
          A record of all payouts you've received
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No Payouts Yet</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Pending commissions will be batched and paid out periodically.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paid Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>{format(payout.paidAt, 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {format(payout.periodStart, 'MMM d')} - {format(payout.periodEnd, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(payout.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{payout.method || 'manual'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
