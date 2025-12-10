import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Calendar, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAllPayouts, useGeneratePayouts } from '@/hooks/usePayouts';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function PayoutGeneratorForm() {
  const { toast } = useToast();
  const generatePayouts = useGeneratePayouts();
  
  // Default to last month
  const lastMonth = subMonths(new Date(), 1);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

  const handleGenerate = async () => {
    try {
      const result = await generatePayouts.mutateAsync({ periodStart, periodEnd });
      
      if (result.affiliatesPaid === 0) {
        toast({
          title: 'No Pending Commissions',
          description: 'No pending commissions found in the selected period.',
        });
      } else {
        toast({
          title: 'Payouts Generated',
          description: `Generated payouts for ${result.affiliatesPaid} affiliate(s) totaling ${formatCurrency(result.totalAmount)}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate payouts',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Generate Payouts
        </CardTitle>
        <CardDescription>
          Select a date range to batch pending commissions into payout records and mark them as paid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="periodStart">Period Start</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodEnd">Period End</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-44"
            />
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={generatePayouts.isPending}
            className="flex items-center gap-2"
          >
            {generatePayouts.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Generate Payouts for Period
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          This will aggregate all pending commissions within the date range, create a payout record for each affiliate, 
          and mark those commissions as paid.
        </p>
      </CardContent>
    </Card>
  );
}

function PayoutHistoryTable() {
  const { data: payouts = [], isLoading } = useAllPayouts();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No Payouts Yet</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          Use the form above to generate your first payout batch.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paid Date</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Affiliate</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Method</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payouts.map((payout) => (
          <TableRow key={payout.id}>
            <TableCell>{format(payout.paidAt, 'MMM d, yyyy h:mm a')}</TableCell>
            <TableCell>
              {format(payout.periodStart, 'MMM d')} - {format(payout.periodEnd, 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="font-medium">{payout.affiliateUsername}</TableCell>
            <TableCell className="text-right font-bold">{formatCurrency(payout.amount)}</TableCell>
            <TableCell>
              <Badge variant="secondary">{payout.method || 'manual'}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminPayouts() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  if (roleLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Affiliate Payouts</h1>
        <p className="text-muted-foreground">Generate and manage affiliate commission payouts</p>
      </div>

      <PayoutGeneratorForm />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Payout History
          </CardTitle>
          <CardDescription>
            All processed payouts across affiliates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayoutHistoryTable />
        </CardContent>
      </Card>
    </div>
  );
}
