import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Building2, User, Mail, Phone, Calendar, CreditCard, 
  ExternalLink, AlertTriangle, CheckCircle2, XCircle,
  History, HelpCircle, ArrowLeft, Activity,
  TrendingUp, TrendingDown, Minus, MessageSquare
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getUsageStatus } from '@/components/affiliate/AffiliateCustomerDetailDialog';
import { getOnboardingProgress, ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/lib/onboardingSteps';
import { CommissionDisplay } from '@/components/affiliate/CommissionDisplay';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default function AffiliateCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { affiliate, affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();

  useEffect(() => {
    document.title = 'Customer Details | EverLaunch';
  }, []);

  // Fetch customer details
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['affiliate-customer-detail', id, affiliateId],
    enabled: !!id && !!affiliateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', id!)
        .eq('affiliate_id', affiliateId!)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch last activity from vapi_calls
  const { data: lastActivity } = useQuery({
    queryKey: ['customer-last-activity', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vapi_calls')
        .select('created_at')
        .eq('customer_id', id!)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.created_at ? new Date(data.created_at) : null;
    },
  });

  // Fetch commission info
  const { data: commission } = useQuery({
    queryKey: ['customer-commission', id, affiliateId],
    enabled: !!id && !!affiliateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('amount, commission_level')
        .eq('customer_id', id!)
        .eq('affiliate_id', affiliateId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const isLoading = affiliateLoading || customerLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/affiliate/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Customer Not Found</h2>
            <p className="text-muted-foreground">
              This customer doesn't exist or you don't have access to view them.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = getOnboardingProgress(customer.onboarding_stage);
  const isComplete = progress.completed === progress.total;
  const usage = getUsageStatus(lastActivity);

  const handleEmailClick = () => {
    if (customer.lead_email) {
      const affiliateName = affiliate?.username || 'Your EverLaunch Partner';
      const affiliateUrl = affiliate?.username ? `tryeverlaunch.com/${affiliate.username}` : 'tryeverlaunch.com';
      
      const subject = 'Help with your EverLaunch setup';
      const body = `Hi ${customer.contact_name || 'there'},

I'm ${affiliateName}, your EverLaunch partner. I noticed you haven't completed your setup yet.

I'm here to help! What questions can I answer?

Best regards,
${affiliateName}

---
Get your AI receptionist: ${affiliateUrl}`;

      // Always open Gmail web interface
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customer.lead_email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');
    }
  };

  const handlePhoneClick = () => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  const TrendIcon = usage.trend === 'up' ? TrendingUp : usage.trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/affiliate/customers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              {customer.business_name || 'Unknown Business'}
            </h1>
            <p className="text-muted-foreground">
              Customer since {customer.created_at ? format(new Date(customer.created_at), 'MMMM d, yyyy') : 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {customer.lead_email && (
            <Button variant="outline" onClick={handleEmailClick}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          )}
          {customer.phone && (
            <Button variant="outline" onClick={handlePhoneClick}>
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Contact Name</label>
                <p className="font-medium">{customer.contact_name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Business Type</label>
                <p className="font-medium">{customer.business_type || 'Not specified'}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </div>
                {customer.lead_email ? (
                  <button
                    type="button"
                    onClick={handleEmailClick}
                    className="font-medium text-primary hover:underline"
                  >
                    {customer.lead_email}
                  </button>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Phone</span>
                </div>
                {customer.phone ? (
                  <a 
                    href={`tel:${customer.phone}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </div>

              {customer.website_url && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-sm">Website</span>
                  </div>
                  <a 
                    href={customer.website_url.startsWith('http') ? customer.website_url : `https://${customer.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {customer.website_url}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage & Activity Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Usage Status
            </CardTitle>
            <CardDescription>
              Activity level and engagement tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-lg p-4 ${
              usage.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800' :
              usage.status === 'low' ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' :
              usage.status === 'at_risk' ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' :
              'bg-muted/50 border border-border'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{usage.icon}</span>
                  <div>
                    <p className="font-semibold text-lg">{usage.label}</p>
                    <p className="text-sm text-muted-foreground">{usage.description}</p>
                  </div>
                </div>
                <TrendIcon className={`h-6 w-6 ${
                  usage.trend === 'up' ? 'text-emerald-500' : 
                  usage.trend === 'down' ? 'text-red-500' : 
                  'text-muted-foreground'
                }`} />
              </div>
              
              {usage.status === 'at_risk' && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    This customer may need help. Consider reaching out.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleEmailClick}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Check-in Email
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              Setup Status
            </CardTitle>
            <CardDescription>
              Onboarding progress: {progress.completed} of {progress.total} steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>

            {isComplete ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-medium text-emerald-800 dark:text-emerald-300">Setup Complete!</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">This customer is fully onboarded and ready to go.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3">Remaining Steps:</p>
                {progress.incompleteSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    {step}
                  </div>
                ))}
                <Button className="w-full mt-4" variant="default" onClick={handleEmailClick}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Complete Setup
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Plan</label>
                <Badge variant="secondary" className="mt-1 font-medium">
                  {customer.plan_name || 'Unknown'}
                </Badge>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Joined</label>
                <p className="font-medium">
                  {customer.created_at ? format(new Date(customer.created_at), 'MMM d, yyyy') : 'Unknown'}
                </p>
              </div>
            </div>

            {customer.payment_received_at && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Payment Received</label>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(customer.payment_received_at))} ago
                </p>
              </div>
            )}

            {commission && (
              <>
                <Separator />
                <CommissionDisplay
                  earnedAmount={Number(commission.amount)}
                  commissionLevel={commission.commission_level}
                  planMonthlyPrice={399}
                  planName={customer.plan_name || 'Professional'}
                  customerCreatedAt={customer.created_at ? new Date(customer.created_at) : null}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {customer.lead_email && (
              <Button variant="outline" onClick={handleEmailClick}>
                <Mail className="h-4 w-4 mr-2" />
                Email Customer
              </Button>
            )}
            {customer.phone && (
              <Button variant="outline" onClick={handlePhoneClick}>
                <Phone className="h-4 w-4 mr-2" />
                Call Customer
              </Button>
            )}
            {!isComplete && (
              <Button variant="outline" onClick={handleEmailClick}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Send Setup Reminder
              </Button>
            )}
            <Button variant="ghost" disabled>
              <History className="h-4 w-4 mr-2" />
              View Call History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
