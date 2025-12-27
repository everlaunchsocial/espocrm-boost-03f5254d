import { useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Users,
  BarChart3, PieChart, Activity, Award, ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useDeals, useLeads, useActivities } from '@/hooks/useCRMData';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function ExecutiveDashboard() {
  const { data: deals = [] } = useDeals();
  const { data: leads = [] } = useLeads();
  const { data: activities = [] } = useActivities();

  // Calculate metrics
  const metrics = useMemo(() => {
    const closedWonDeals = deals.filter(d => d.stage === 'closed-won');
    const closedLostDeals = deals.filter(d => d.stage === 'closed-lost');
    const openDeals = deals.filter(d => !['closed-won', 'closed-lost'].includes(d.stage));

    const totalRevenue = closedWonDeals.reduce((sum, d) => sum + d.amount, 0);
    const pipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
    const totalDeals = closedWonDeals.length;
    const winRate = closedWonDeals.length + closedLostDeals.length > 0
      ? (closedWonDeals.length / (closedWonDeals.length + closedLostDeals.length)) * 100
      : 0;
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

    return {
      totalRevenue,
      pipelineValue,
      totalDeals,
      winRate,
      avgDealSize,
      totalLeads: leads.length,
      activeLeads: leads.filter(l => ['new_lead', 'contact_attempted', 'demo_engaged'].includes(l.pipelineStatus)).length,
    };
  }, [deals, leads]);

  // Pipeline by stage data
  const pipelineByStage = useMemo(() => {
    const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    return stages.map(stage => ({
      name: stage.replace('Closed ', ''),
      value: deals.filter(d => d.stage === stage).length,
      amount: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.amount, 0),
    }));
  }, [deals]);

  // Lead sources data
  const leadSources = useMemo(() => {
    const sources: Record<string, number> = {};
    leads.forEach(lead => {
      const source = lead.source || 'other';
      sources[source] = (sources[source] || 0) + 1;
    });
    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [leads]);

  // Activity trend data (last 7 days)
  const activityTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'EEE'),
        calls: 0,
        emails: 0,
        meetings: 0,
      };
    });

    activities.forEach(activity => {
      const activityDate = format(new Date(activity.createdAt), 'EEE');
      const dayData = days.find(d => d.date === activityDate);
      if (dayData) {
        if (activity.type === 'call') dayData.calls++;
        else if (activity.type === 'email') dayData.emails++;
        else if (activity.type === 'meeting') dayData.meetings++;
      }
    });

    return days;
  }, [activities]);

  // Conversion funnel data
  const funnelData = useMemo(() => {
    const newLeads = leads.filter(l => l.pipelineStatus === 'new_lead').length;
    const contacted = leads.filter(l => ['contacted', 'demo_requested'].includes(l.pipelineStatus)).length;
    const engaged = leads.filter(l => ['demo_completed', 'hot_lead', 'negotiating', 'ready_to_sign'].includes(l.pipelineStatus)).length;
    const won = leads.filter(l => l.pipelineStatus === 'closed_won').length;

    return [
      { name: 'New Leads', value: newLeads, fill: 'hsl(var(--primary))' },
      { name: 'Contacted', value: contacted, fill: 'hsl(var(--chart-2))' },
      { name: 'Engaged', value: engaged, fill: 'hsl(var(--chart-3))' },
      { name: 'Won', value: won, fill: 'hsl(var(--chart-4))' },
    ];
  }, [leads]);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-foreground">Overview of your sales performance</p>
        </div>
        <Tabs defaultValue="month" className="w-auto">
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="quarter">This Quarter</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          change={12}
          icon={DollarSign}
          iconColor="text-green-500"
          bgColor="bg-green-500/10"
        />
        <MetricCard
          title="Deals Closed"
          value={metrics.totalDeals.toString()}
          change={8}
          icon={Target}
          iconColor="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <MetricCard
          title="Win Rate"
          value={`${Math.round(metrics.winRate)}%`}
          change={5}
          icon={Award}
          iconColor="text-purple-500"
          bgColor="bg-purple-500/10"
        />
        <MetricCard
          title="Pipeline Value"
          value={`$${metrics.pipelineValue.toLocaleString()}`}
          change={-3}
          icon={TrendingUp}
          iconColor="text-orange-500"
          bgColor="bg-orange-500/10"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pipeline by Stage
            </CardTitle>
            <CardDescription>Deals distribution across stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pipelineByStage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg">
                          <p className="font-medium">{payload[0].payload.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payload[0].value} deals
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${payload[0].payload.amount.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Top Performers
            </CardTitle>
            <CardDescription>Revenue leaders this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Sarah Johnson', revenue: 45000, deals: 12 },
                { name: 'Mike Chen', revenue: 38000, deals: 10 },
                { name: 'Emily Davis', revenue: 32000, deals: 8 },
                { name: 'James Wilson', revenue: 28000, deals: 7 },
                { name: 'Lisa Brown', revenue: 22000, deals: 6 },
              ].map((performer, i) => (
                <div key={performer.name} className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                    i === 0 ? "bg-yellow-500/20 text-yellow-600" :
                    i === 1 ? "bg-gray-300/30 text-gray-600" :
                    i === 2 ? "bg-orange-500/20 text-orange-600" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{performer.name}</p>
                    <p className="text-xs text-muted-foreground">{performer.deals} deals</p>
                  </div>
                  <p className="font-semibold">${performer.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-3 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((stage, i) => (
                <div key={stage.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{stage.name}</span>
                    <span className="font-medium">{stage.value}</span>
                  </div>
                  <Progress
                    value={funnelData[0].value > 0 ? (stage.value / funnelData[0].value) * 100 : 0}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie
                  data={leadSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {leadSources.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {leadSources.map((source, i) => (
                <Badge key={source.name} variant="outline" className="text-xs">
                  <span
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  {source.name}: {source.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="emails"
                  stackId="1"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-bold">{metrics.activeLeads}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold">${Math.round(metrics.avgDealSize).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{metrics.totalLeads}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
}

function MetricCard({ title, value, change, icon: Icon, iconColor, bgColor }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <div className={cn(
              "flex items-center gap-1 mt-1 text-sm",
              isPositive ? "text-green-600" : "text-red-600"
            )}>
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{Math.abs(change)}%</span>
            </div>
          </div>
          <div className={cn("p-2 rounded-lg", bgColor)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
