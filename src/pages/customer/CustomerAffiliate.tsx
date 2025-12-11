import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Users, DollarSign, TrendingUp, Gift, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EarningsDisclaimer } from '@/components/EarningsDisclaimer';

interface AffiliateData {
  id: string;
  username: string;
  totalReferrals: number;
  activeCustomers: number;
  totalEarned: number;
  pendingCommissions: number;
}

export default function CustomerAffiliate() {
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  async function fetchAffiliateData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get affiliate record for this customer (created as dormant during purchase)
      const { data: affiliate, error: affError } = await supabase
        .from('affiliates')
        .select('id, username')
        .eq('user_id', user.id)
        .single();

      if (affError || !affiliate) {
        // No affiliate record found - customer wasn't enrolled
        setIsLoading(false);
        return;
      }

      // Get referral stats
      const { count: referralCount } = await supabase
        .from('customer_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affiliate.id);

      // Get commission stats
      const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('amount, status')
        .eq('affiliate_id', affiliate.id);

      const totalEarned = commissions
        ?.filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0) || 0;

      const pendingCommissions = commissions
        ?.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0) || 0;

      setAffiliateData({
        id: affiliate.id,
        username: affiliate.username,
        totalReferrals: referralCount || 0,
        activeCustomers: referralCount || 0, // Same as referrals for now
        totalEarned,
        pendingCommissions,
      });
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCopyLink = () => {
    if (!affiliateData?.username) return;
    const link = `https://tryeverlaunch.com/${affiliateData.username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Affiliate Program</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Earn money by referring other businesses to EverLaunch AI. Contact support to activate your affiliate account.
            </p>
            <Button variant="outline">Contact Support</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Earn By Referring</h1>
        <p className="text-muted-foreground">Share EverLaunch with other businesses and earn commissions</p>
      </div>

      {/* Referral Link Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with businesses who could benefit from an AI receptionist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-background border rounded-lg px-4 py-3 font-mono text-sm truncate">
              https://tryeverlaunch.com/{affiliateData.username}
            </div>
            <Button onClick={handleCopyLink} className="shrink-0">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            You earn <span className="font-semibold text-primary">30% commission</span> on every referral who becomes a customer
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{affiliateData.totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">${affiliateData.totalEarned.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">${affiliateData.pendingCommissions.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Info */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Share Your Link</p>
                <p className="text-sm text-muted-foreground">Send your referral link to businesses who need an AI receptionist</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">They Sign Up</p>
                <p className="text-sm text-muted-foreground">When they purchase through your link, you get credited</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Earn 30%</p>
                <p className="text-sm text-muted-foreground">Receive 30% commission on their monthly subscription</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Disclaimer */}
      <EarningsDisclaimer variant="inline" className="text-center" />
    </div>
  );
}
