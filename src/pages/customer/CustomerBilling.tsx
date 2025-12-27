import { CreditCard, Clock, AlertTriangle, CheckCircle, Receipt, ExternalLink, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrentCustomerBilling } from '@/hooks/useCustomerBilling';
import { useCustomerBillingInfo, useCreateCustomerPortalSession } from '@/hooks/useCustomerBillingInfo';
import { format } from 'date-fns';

function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return <Badge variant="default" className="bg-green-600">Active</Badge>;
    case 'trialing':
      return <Badge variant="secondary">Trial</Badge>;
    case 'past_due':
      return <Badge variant="destructive">Past Due</Badge>;
    case 'canceled':
      return <Badge variant="outline">Canceled</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
}

function getInvoiceStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return <Badge variant="default" className="bg-green-600">Paid</Badge>;
    case 'open':
      return <Badge variant="secondary">Upcoming</Badge>;
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'uncollectible':
    case 'void':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
}

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function capitalizeFirst(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function CustomerBilling() {
  const { data: billing, isLoading: billingLoading } = useCurrentCustomerBilling();
  const { data: billingInfo, isLoading: infoLoading } = useCustomerBillingInfo();
  const portalMutation = useCreateCustomerPortalSession();

  const isLoading = billingLoading || infoLoading;

  // Calculate usage percentage
  const usagePercentage = billing?.minutes_included && billing.minutes_included > 0
    ? Math.min(((billing.total_minutes_used || 0) / billing.minutes_included) * 100, 100)
    : 0;

  const remainingMinutes = billing?.minutes_included 
    ? Math.max((billing.minutes_included || 0) - (billing.total_minutes_used || 0), 0)
    : 0;

  const hasOverage = (billing?.overage_minutes || 0) > 0;

  const handleManageBilling = () => {
    portalMutation.mutate();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
          <p className="text-muted-foreground">
            View your plan, usage, and billing history
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full mt-2" />
              </CardContent>
            </Card>
          </div>
        ) : !billing && !billingInfo ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  No subscription found
                </p>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  We couldn't find an active subscription for this account. Please contact support if you believe this is an error.
                </p>
                <Button variant="outline" asChild>
                  <a href="mailto:support@everlaunch.ai">
                    Contact Support
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {/* Current Plan Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Your Plan
                    </CardTitle>
                    <CardDescription>
                      Your subscription details and billing information.
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleManageBilling}
                    disabled={portalMutation.isPending}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {portalMutation.isPending ? 'Opening...' : 'Manage Billing'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">
                        {billing?.plan_name || billingInfo?.plan?.name || 'Standard Plan'}
                      </h3>
                      <p className="text-lg text-muted-foreground">
                        {formatCurrency(billing?.monthly_price || billingInfo?.plan?.monthly_price)}/month
                      </p>
                    </div>
                    {getStatusBadge(billingInfo?.subscription?.subscriptionStatus || 'active')}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">Included Minutes</p>
                      <p className="text-lg font-semibold text-foreground">
                        {(billing?.minutes_included || billingInfo?.plan?.minutes_included || 0).toLocaleString()} min/month
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overage Rate</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatCurrency(billing?.overage_rate || billingInfo?.plan?.overage_rate)}/min
                      </p>
                    </div>
                  </div>

                  {billingInfo?.subscription?.currentPeriodStart && billingInfo?.subscription?.currentPeriodEnd && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">Current Billing Period</p>
                      <p className="text-foreground">
                        {format(new Date(billingInfo.subscription.currentPeriodStart), 'MMM d, yyyy')} – {format(new Date(billingInfo.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-4 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Your subscription is active.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Billing Date Card */}
            {billingInfo?.subscription?.nextBillingDate && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Next Billing Date
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {format(new Date(billingInfo.subscription.nextBillingDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(billingInfo.subscription.nextBillingAmount || billing?.monthly_price)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Method Card */}
            {billingInfo?.subscription?.paymentMethodLast4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-muted">
                        <CreditCard className="h-6 w-6 text-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {capitalizeFirst(billingInfo.subscription.paymentMethodBrand)} •••• {billingInfo.subscription.paymentMethodLast4}
                        </p>
                        {billingInfo.subscription.paymentMethodExpMonth && billingInfo.subscription.paymentMethodExpYear && (
                          <p className="text-sm text-muted-foreground">
                            Expires: {billingInfo.subscription.paymentMethodExpMonth}/{billingInfo.subscription.paymentMethodExpYear.toString().slice(-2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={portalMutation.isPending}
                    >
                      Update Payment Method
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Usage Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Current Usage
                </CardTitle>
                <CardDescription>
                  Track your minutes usage for this billing period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {Math.round(billing?.total_minutes_used || 0).toLocaleString()} of {(billing?.minutes_included || 0).toLocaleString()} minutes used
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(usagePercentage)}%
                      </span>
                    </div>
                    <Progress value={usagePercentage} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="text-2xl font-bold text-foreground">
                        {Math.round(remainingMinutes).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">minutes</p>
                    </div>
                    <div className={`p-4 rounded-lg ${hasOverage ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                      <p className="text-sm text-muted-foreground">Overage</p>
                      <p className={`text-2xl font-bold ${hasOverage ? 'text-destructive' : 'text-foreground'}`}>
                        {Math.round(billing?.overage_minutes || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">minutes</p>
                    </div>
                  </div>

                  {hasOverage && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Overage charges this period
                        </p>
                        <p className="text-lg font-bold text-destructive">
                          {formatCurrency(billing?.overage_cost)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on {Math.round(billing?.overage_minutes || 0)} overage minutes at {formatCurrency(billing?.overage_rate)}/min
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Estimated Total This Period</span>
                      <span className="text-xl font-bold text-foreground">
                        {formatCurrency(billing?.total_estimated_cost)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estimate only. Final billing may vary slightly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Billing History
                </CardTitle>
                <CardDescription>
                  Your past invoices and payments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingInfo.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {format(new Date(invoice.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{invoice.description}</TableCell>
                          <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                          <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            {invoice.pdfUrl ? (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      No billing history available yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
