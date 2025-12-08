import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Presentation, TrendingUp, Calendar } from 'lucide-react';
import { useAffiliateLeadCount } from '@/hooks/useAffiliateLeads';
import { useAffiliateDemoCount, useAffiliateDemosThisWeek } from '@/hooks/useAffiliateDemos';
import { Skeleton } from '@/components/ui/skeleton';

export default function AffiliateDashboard() {
  const { data: leadCount, isLoading: leadsLoading } = useAffiliateLeadCount();
  const { data: demoCount, isLoading: demosLoading } = useAffiliateDemoCount();
  const { data: demosThisWeek, isLoading: weekLoading } = useAffiliateDemosThisWeek();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your affiliate back office</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
