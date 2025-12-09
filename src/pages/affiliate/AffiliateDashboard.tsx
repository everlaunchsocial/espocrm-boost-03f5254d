import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Presentation, Calendar, Copy, Phone } from 'lucide-react';
import { useAffiliateLeadCount } from '@/hooks/useAffiliateLeads';
import { useAffiliateDemoCount, useAffiliateDemosThisWeek } from '@/hooks/useAffiliateDemos';
import { Skeleton } from '@/components/ui/skeleton';
import { DemoCreditsCard } from '@/components/affiliate/DemoCreditsCard';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function AffiliateDashboard() {
  const { data: leadCount, isLoading: leadsLoading } = useAffiliateLeadCount();
  const { data: demoCount, isLoading: demosLoading } = useAffiliateDemoCount();
  const { data: demosThisWeek, isLoading: weekLoading } = useAffiliateDemosThisWeek();
  const { affiliate, isLoading: affiliateLoading } = useCurrentAffiliate();

  // Fetch sponsor info separately to avoid RLS issues with self-referential joins
  const { data: sponsorUsername, isLoading: sponsorLoading } = useQuery({
    queryKey: ['affiliate-sponsor', affiliate?.id],
    queryFn: async () => {
      if (!affiliate?.id) {
        console.log('[AffiliateDashboard] No affiliate id, skipping sponsor query');
        return null;
      }
      
      console.log('[AffiliateDashboard] Fetching sponsor for affiliate:', affiliate.id);
      
      // First, get the parent_affiliate_id from current affiliate
      const parentId = affiliate.parent_affiliate_id;
      console.log('[AffiliateDashboard] Parent affiliate ID:', parentId);
      
      if (!parentId) {
        console.log('[AffiliateDashboard] No parent affiliate (top-level affiliate)');
        return null;
      }

      // Then, fetch sponsor's username separately
      const { data: sponsor, error: sponsorError } = await supabase
        .from('affiliates')
        .select('username')
        .eq('id', parentId)
        .maybeSingle();

      console.log('[AffiliateDashboard] Sponsor query result:', { sponsor, sponsorError });

      if (sponsorError) {
        console.error('[AffiliateDashboard] Error fetching sponsor - RLS may be blocking:', sponsorError);
        return null;
      }

      return sponsor?.username || null;
    },
    enabled: !!affiliate?.id,
  });

  const referralLink = affiliate?.username 
    ? `https://tryeverlaunch.com/${affiliate.username}`
    : '';

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
            ) : sponsorUsername ? (
              <span className="font-medium capitalize">{sponsorUsername}</span>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <DemoCreditsCard compact />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
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
