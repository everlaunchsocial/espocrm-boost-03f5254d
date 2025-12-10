import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy, Check, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAffiliate } from '@/hooks/useCurrentAffiliate';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  username: string;
  created_at: string;
}

export default function AffiliateTeam() {
  const { affiliate, isLoading: affiliateLoading } = useCurrentAffiliate();
  const [copied, setCopied] = useState(false);

  // Fetch tier 1 (direct) recruits
  const { data: tier1Members = [], isLoading: tier1Loading } = useQuery({
    queryKey: ['affiliate-team-tier1', affiliate?.id],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!affiliate?.id) return [];

      const { data, error } = await supabase
        .from('affiliates')
        .select('id, username, created_at')
        .eq('parent_affiliate_id', affiliate.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliate?.id,
  });

  // Fetch tier 2 count (recruits of my recruits)
  const { data: tier2Count = 0, isLoading: tier2Loading } = useQuery({
    queryKey: ['affiliate-team-tier2-count', affiliate?.id],
    queryFn: async (): Promise<number> => {
      if (!affiliate?.id || tier1Members.length === 0) return 0;

      const tier1Ids = tier1Members.map(m => m.id);
      
      const { count, error } = await supabase
        .from('affiliates')
        .select('id', { count: 'exact', head: true })
        .in('parent_affiliate_id', tier1Ids);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!affiliate?.id && tier1Members.length > 0,
  });

  const referralLink = affiliate?.username 
    ? `https://tryeverlaunch.com/affiliate-signup?ref=${affiliate.username}`
    : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (affiliateLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Team</h1>
        <p className="text-muted-foreground">Manage and track your sub-affiliates</p>
      </div>

      {/* Referral Link Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share this link to recruit affiliates to your team and earn 15% on their sales:
          </p>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-background font-mono text-sm"
            />
            <Button onClick={copyToClipboard} variant="outline" className="shrink-0">
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tier 1 (Direct)</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {tier1Loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{tier1Members.length}</div>
            )}
            <p className="text-xs text-muted-foreground">Earn 15% on their sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tier 2</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tier2Loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{tier2Count}</div>
            )}
            <p className="text-xs text-muted-foreground">Earn 5% on their sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tier 3</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">—</div>
            <p className="text-xs text-muted-foreground">Hidden for privacy</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Recruits (Tier 1)</CardTitle>
        </CardHeader>
        <CardContent>
          {tier1Loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : tier1Members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No team members yet</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Share your referral link to start building your team and earn commissions on their sales!
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {tier1Members.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {member.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{member.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(member.created_at), 'MMM d, yyyy')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
