import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Presentation, Calendar, Copy, TrendingUp, Clock } from 'lucide-react';
import { useAffiliateLeadCount } from '@/hooks/useAffiliateLeads';
import { useAffiliateDemoCount, useAffiliateDemosThisWeek } from '@/hooks/useAffiliateDemos';
import { useCommissionSummary } from '@/hooks/useAffiliateCommissions';
import { Skeleton } from '@/components/ui/skeleton';
import { DemoCreditsCard } from '@/components/affiliate/DemoCreditsCard';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function AffiliateDashboard() {
  const { data: leadCount, isLoading: leadsLoading } = useAffiliateLeadCount();
  const { data: demoCount, isLoading: demosLoading } = useAffiliateDemoCount();
  const { data: demosThisWeek, isLoading: weekLoading } = useAffiliateDemosThisWeek();
  const { data: commissionSummary, isLoading: commissionsLoading } = useCommissionSummary();
  const { affiliate, isLoading: affiliateLoading } = useCurrentAffiliate();
  
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [sponsorLoading, setSponsorLoading] = useState(false);

  console.log('[AffiliateDashboard] Render - affiliate:', affiliate, 'isLoading:', affiliateLoading);

  // Debug: Test direct query to affiliates table
  useEffect(() => {
    const debugQuery = async () => {
      console.log('[AffiliateDashboard DEBUG] Testing direct query to affiliates table...');
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .limit(1);
      
      console.log('[AffiliateDashboard DEBUG] Sample affiliates record:', data?.[0]);
      console.log('[AffiliateDashboard DEBUG] Query error:', error);
    };
    
    debugQuery();
  }, []);

  // Fetch sponsor info
  useEffect(() => {
    const fetchSponsor = async () => {
      console.log('[AffiliateDashboard] fetchSponsor called, affiliate:', affiliate);
      
      if (!affiliate?.parent_affiliate_id) {
        console.log('[AffiliateDashboard] No parent_affiliate_id, sponsor = null');
        setSponsorName(null);
        return;
      }

      setSponsorLoading(true);
      console.log('[AffiliateDashboard] Fetching sponsor for parent_id:', affiliate.parent_affiliate_id);

      try {
        const { data, error } = await supabase
          .from('affiliates')
          .select('username')
          .eq('id', affiliate.parent_affiliate_id)
          .maybeSingle();

        console.log('[AffiliateDashboard] Sponsor query result:', { data, error });

        if (error) {
          console.error('[AffiliateDashboard] Sponsor query error:', error);
        } else if (data) {
          console.log('[AffiliateDashboard] Sponsor found:', data.username);
          setSponsorName(data.username);
        } else {
          console.log('[AffiliateDashboard] No sponsor record found');
          setSponsorName(null);
        }
      } catch (err) {
        console.error('[AffiliateDashboard] Sponsor fetch exception:', err);
      } finally {
        setSponsorLoading(false);
      }
    };

    fetchSponsor();
  }, [affiliate?.id, affiliate?.parent_affiliate_id]);

  const referralLink = affiliate?.username 
    ? `https://tryeverlaunch.com/${affiliate.username}`
    : '';

  console.log('[AffiliateDashboard] Derived values:', { referralLink, sponsorName });

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sponsor & Referral Link Section */}
      <Card className="bg-muted/50 border">
        <CardContent className="pt-4 pb-4 space-y-3">
          {/* Sponsor Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-sm text-muted-foreground">Your Sponsor:</span>
          {affiliateLoading || sponsorLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : sponsorName ? (
              <span className="font-medium capitalize">{sponsorName}</span>
            ) : (
              <span className="text-muted-foreground italic">Not assigned yet</span>
            )}
          </div>
          
          {/* Referral Link */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Your Referral Link:</span>
            {affiliateLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <code className="text-sm bg-background px-2 py-1 rounded border truncate flex-1">
                  {referralLink || 'Not available'}
                </code>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyReferralLink}
                  disabled={!referralLink}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your affiliate back office</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                ${(commissionSummary?.pendingThisMonth || 0).toFixed(2)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                ${(commissionSummary?.lifetimeEarned || 0).toFixed(2)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{leadCount}</div>
            )}
            <p className="text-xs text-muted-foreground">In your pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Demos</CardTitle>
            <Presentation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {demosLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{demoCount}</div>
            )}
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demos This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {weekLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{demosThisWeek}</div>
            )}
            <p className="text-xs text-muted-foreground">Created this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Second row: Credits + Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DemoCreditsCard compact />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Annual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">
                ${(commissionSummary?.projectedAnnual || 0).toFixed(0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Projected (not guaranteed)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Demos</CardTitle>
            <Presentation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {demosLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{demoCount}</div>
            )}
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demos This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {weekLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{demosThisWeek}</div>
            )}
            <p className="text-xs text-muted-foreground">Created this week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Welcome to your EverLaunch affiliate dashboard! Here's how to get started:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Add leads from local businesses in your area</li>
            <li>Create personalized AI demos for each prospect</li>
            <li>Send demo links via email</li>
            <li>Track engagement and close deals</li>
            <li>Earn 30% commission on every sale!</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
