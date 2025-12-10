import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentCustomerBilling } from '@/hooks/useCustomerBilling';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Phone, DollarSign, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerUsage() {
  const { isCustomer, isLoading: roleLoading } = useUserRole();
  const { data: billing, isLoading } = useCurrentCustomerBilling();

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!isCustomer) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <h1 className="text-3xl font-bold mb-8">Usage & Billing</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="min-h-screen bg-background p-8">
        <h1 className="text-3xl font-bold mb-8">Usage & Billing</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No plan assigned yet. Please contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const minutesUsed = billing.total_minutes_used || 0;
  const minutesIncluded = billing.minutes_included || 0;
  const minutesRemaining = Math.max(minutesIncluded - minutesUsed, 0);
  const usagePercent = minutesIncluded > 0 ? Math.min((minutesUsed / minutesIncluded) * 100, 100) : 0;
  const hasOverage = (billing.overage_minutes || 0) > 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-8">Usage & Billing</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Plan Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your Plan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billing.plan_name}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${billing.monthly_price}/month • {minutesIncluded} minutes included
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Overage rate: ${billing.overage_rate}/min
            </p>
          </CardContent>
        </Card>

        {/* Minutes Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Minutes Used</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {minutesUsed.toFixed(1)} / {minutesIncluded}
            </div>
            <Progress 
              value={usagePercent} 
              className={`mt-3 ${hasOverage ? '[&>div]:bg-destructive' : ''}`}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {minutesRemaining.toFixed(1)} minutes remaining
            </p>
          </CardContent>
        </Card>

        {/* Estimated Charges */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estimated Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(billing.total_estimated_cost || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Base: ${billing.base_cost} + Overage: ${(billing.overage_cost || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overage Alert */}
      {hasOverage && (
        <Card className="mt-6 border-destructive">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-sm font-medium text-destructive">Overage Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              You've used <strong>{(billing.overage_minutes || 0).toFixed(1)} minutes</strong> over your included limit.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Estimated overage cost so far: <strong>${(billing.overage_cost || 0).toFixed(2)}</strong>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Billing Cycle */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Billing Cycle</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {billing.billing_cycle_start && billing.billing_cycle_end ? (
            <>
              <p className="text-sm">
                <strong>Current cycle:</strong>{' '}
                {format(new Date(billing.billing_cycle_start), 'MMM d, yyyy')} –{' '}
                {format(new Date(billing.billing_cycle_end), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Estimate only. Final billing may vary slightly based on timing and adjustments.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No billing cycle set yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
