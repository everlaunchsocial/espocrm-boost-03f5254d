import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CreditCard, 
  Sparkles, 
  Receipt, 
  ExternalLink,
  Download,
  Crown,
  Zap,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import UpgradePlanSection from '@/components/affiliate/UpgradePlanSection';

interface BillingInfo {
  affiliate: {
    id: string;
    demoCreditsRemaining: number | null;
    demoCreditsUsedThisMonth: number | null;
    billingCycleStart: string | null;
  };
  plan: {
    id: string;
    code: string;
    name: string;
    monthly_price: number;
    demo_credits_per_month: number | null;
  } | null;
  subscription: {
    hasActiveSubscription: boolean;
    paymentMethodLast4: string | null;
    paymentMethodBrand: string | null;
    nextBillingDate: string | null;
    subscriptionStatus: string | null;
    customerId: string | null;
  };
  billingHistory: Array<{
    id: string;
    description: string;
    amount_cents: number;
    status: string;
    invoice_pdf_url: string | null;
    created_at: string;
  }>;
}

const planCredits: Record<string, number | 'unlimited'> = {
  free: 5,
  basic: 10,
  pro: 50,
  agency: 'unlimited',
};

const planIcons: Record<string, React.ReactNode> = {
  free: <Package className="h-5 w-5" />,
  basic: <Zap className="h-5 w-5" />,
  pro: <Sparkles className="h-5 w-5" />,
  agency: <Crown className="h-5 w-5" />,
};

export default function AffiliateBilling() {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const fetchBillingInfo = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-billing-info');
      
      if (error) throw error;
      
      if (data.success) {
        setBillingInfo(data);
      } else {
        throw new Error(data.error || 'Failed to fetch billing info');
      }
    } catch (error: any) {
      console.error('Error fetching billing info:', error);
      toast.error('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const handleManagePayment = async () => {
    setIsPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');
      
      if (error) throw error;
      
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create portal session');
      }
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setIsPortalLoading(false);
    }
  };

  const planCode = billingInfo?.plan?.code || 'free';
  const monthlyAllotment = planCredits[planCode] || 5;
  const creditsRemaining = billingInfo?.affiliate?.demoCreditsRemaining ?? 0;
  const isUnlimited = monthlyAllotment === 'unlimited';
  
  // Calculate progress percentage
  let progressPercent = 0;
  let progressColor = 'bg-primary';
  if (!isUnlimited && typeof monthlyAllotment === 'number') {
    progressPercent = Math.min((creditsRemaining / monthlyAllotment) * 100, 100);
    if (progressPercent <= 20) {
      progressColor = 'bg-destructive';
    } else if (progressPercent <= 50) {
      progressColor = 'bg-amber-500';
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and billing</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {planIcons[planCode] || <Package className="h-5 w-5" />}
              Current Subscription
            </CardTitle>
            <CardDescription>Your active plan details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{billingInfo?.plan?.name || 'Free'}</p>
                <p className="text-lg text-muted-foreground">
                  ${billingInfo?.plan?.monthly_price || 0}/month
                </p>
              </div>
              <Badge variant="secondary" className="text-sm">
                {billingInfo?.subscription?.subscriptionStatus || 'Active'}
              </Badge>
            </div>
            
            {billingInfo?.subscription?.nextBillingDate && (
              <p className="text-sm text-muted-foreground">
                Next billing: {format(new Date(billingInfo.subscription.nextBillingDate), 'MMMM d, yyyy')}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Need to downgrade? <a href="mailto:support@everlaunch.ai" className="text-primary hover:underline">Contact support</a>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Demo Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Demo Credits
            </CardTitle>
            <CardDescription>Credits used for creating AI demos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-2">
              <p className="text-4xl font-bold">
                {isUnlimited ? '∞' : creditsRemaining}
              </p>
              <p className="text-muted-foreground">
                {isUnlimited ? 'Unlimited credits' : 'credits remaining'}
              </p>
            </div>

            {!isUnlimited && (
              <>
                <Progress value={progressPercent} className={`h-2 ${progressColor}`} />
                <p className="text-xs text-center text-muted-foreground">
                  {creditsRemaining} of {monthlyAllotment} monthly credits
                </p>
              </>
            )}

            <Button variant="outline" className="w-full" disabled>
              Buy More Credits (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
            <CardDescription>Manage your payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingInfo?.subscription?.paymentMethodLast4 ? (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium capitalize">
                    {billingInfo.subscription.paymentMethodBrand || 'Card'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    •••• •••• •••• {billingInfo.subscription.paymentMethodLast4}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-secondary rounded-lg text-center text-muted-foreground">
                No payment method on file
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleManagePayment}
              disabled={isPortalLoading || !billingInfo?.subscription?.customerId}
            >
              {isPortalLoading ? 'Loading...' : 'Update Payment Method'}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>Recent transactions and invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {billingInfo?.billingHistory && billingInfo.billingHistory.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingInfo.billingHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-right text-sm">
                          ${(item.amount_cents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {item.invoice_pdf_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(item.invoice_pdf_url!, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No billing history yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Section */}
      <UpgradePlanSection 
        currentPlanCode={planCode} 
        onUpgradeComplete={fetchBillingInfo}
      />
    </div>
  );
}
