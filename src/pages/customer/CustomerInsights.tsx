import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, Phone, Star, Trophy, Zap, Target, Award, Sparkles } from "lucide-react";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CallAnalysis {
  id: string;
  analyzed_at: string;
  overall_score: number;
  score_speed: number;
  score_clarity: number;
  score_tone: number;
  transcript_summary: string;
  call_category: string;
  sentiment: string;
  insights: unknown;
  suggestions: unknown;
}

const MILESTONES = [
  { calls: 10, label: "First 10 Calls", icon: Phone, description: "Your AI handled its first 10 calls!" },
  { calls: 50, label: "Getting Started", icon: Zap, description: "50 calls processed - you're building momentum!" },
  { calls: 100, label: "Century Club", icon: Trophy, description: "100 calls! Your AI is making an impact." },
  { calls: 500, label: "Power User", icon: Star, description: "500 calls - you're a power user!" },
  { calls: 1000, label: "AI Champion", icon: Award, description: "1000+ calls! Maximum efficiency achieved." },
];

export default function CustomerInsights() {
  // Fetch customer's call analyses
  const { data: analyses, isLoading } = useQuery({
    queryKey: ['customer-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_analysis')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as CallAnalysis[];
    },
  });

  // Calculate overall metrics
  const metrics = useMemo(() => {
    if (!analyses?.length) return null;

    const avgScore = analyses.reduce((sum, a) => sum + (a.overall_score || 0), 0) / analyses.length;
    const recentCalls = analyses.slice(0, 10);
    const recentAvg = recentCalls.reduce((sum, a) => sum + (a.overall_score || 0), 0) / recentCalls.length;
    
    // Get older calls for comparison
    const olderCalls = analyses.slice(10, 20);
    const olderAvg = olderCalls.length > 0 
      ? olderCalls.reduce((sum, a) => sum + (a.overall_score || 0), 0) / olderCalls.length 
      : avgScore;
    
    const improvement = recentAvg - olderAvg;
    
    // Find best call
    const bestCall = analyses.reduce((best, current) => 
      (current.overall_score || 0) > (best.overall_score || 0) ? current : best
    , analyses[0]);

    // Calculate sentiment breakdown
    const sentiments = analyses.reduce((acc, a) => {
      acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const positivePercent = Math.round(((sentiments['positive'] || 0) / analyses.length) * 100);

    return { avgScore, recentAvg, improvement, bestCall, positivePercent, totalCalls: analyses.length };
  }, [analyses]);

  // Trend data for chart
  const trendData = useMemo(() => {
    if (!analyses?.length) return [];

    // Group by date
    const byDate: Record<string, { total: number; count: number }> = {};
    analyses.forEach(a => {
      const date = format(new Date(a.analyzed_at), 'MMM d');
      if (!byDate[date]) byDate[date] = { total: 0, count: 0 };
      byDate[date].total += a.overall_score || 0;
      byDate[date].count++;
    });

    return Object.entries(byDate)
      .map(([date, data]) => ({ date, score: Number((data.total / data.count).toFixed(1)) }))
      .reverse()
      .slice(-14); // Last 14 data points
  }, [analyses]);

  // Calculate unlocked milestones
  const unlockedMilestones = useMemo(() => {
    const totalCalls = analyses?.length || 0;
    return MILESTONES.filter(m => totalCalls >= m.calls);
  }, [analyses]);

  const nextMilestone = useMemo(() => {
    const totalCalls = analyses?.length || 0;
    return MILESTONES.find(m => totalCalls < m.calls);
  }, [analyses]);

  // Recent highlights (best 3 calls)
  const recentHighlights = useMemo(() => {
    if (!analyses?.length) return [];
    return [...analyses]
      .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
      .slice(0, 3);
  }, [analyses]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-500/20 border-green-500/30';
    if (score >= 6) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!analyses?.length) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">AI Quality Insights</h1>
          <p className="text-muted-foreground mb-6">
            Your AI quality insights will appear here once your AI receptionist handles its first calls. 
            Each call is automatically analyzed to help improve performance over time.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">What you'll see here:</p>
            <ul className="text-left space-y-1 max-w-sm mx-auto">
              <li>• Your overall AI quality score</li>
              <li>• Improvement trends over time</li>
              <li>• Call highlights and achievements</li>
              <li>• Milestones and badges</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">AI Quality Insights</h1>
        <p className="text-muted-foreground">See how your AI receptionist is performing and improving</p>
      </div>

      {/* Hero Score Card */}
      <Card className={`border-2 ${getScoreBgColor(metrics?.avgScore || 0)}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm font-medium text-muted-foreground mb-1">Your AI Quality Score</p>
              <div className={`text-6xl font-bold ${getScoreColor(metrics?.avgScore || 0)}`}>
                {metrics?.avgScore?.toFixed(1)}<span className="text-2xl text-muted-foreground">/10</span>
              </div>
              {metrics?.improvement !== undefined && metrics.improvement !== 0 && (
                <div className="flex items-center gap-1 mt-2 justify-center md:justify-start">
                  <TrendingUp className={`h-4 w-4 ${metrics.improvement > 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={metrics.improvement > 0 ? 'text-green-500' : 'text-red-500'}>
                    {metrics.improvement > 0 ? '+' : ''}{metrics.improvement.toFixed(1)} from previous calls
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-2xl font-bold">{metrics?.totalCalls}</p>
                <p className="text-xs text-muted-foreground">Calls Analyzed</p>
              </div>
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-500">{metrics?.positivePercent}%</p>
                <p className="text-xs text-muted-foreground">Positive Sentiment</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing Message */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-4 border border-primary/20">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">Your AI learns from every call</p>
            <p className="text-sm text-muted-foreground">
              Each interaction helps optimize responses for better customer experiences
            </p>
          </div>
        </div>
      </div>

      {/* Charts and Milestones Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quality Score Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 10]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={{ fill: 'hsl(var(--primary))' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                More data needed for trend chart
              </div>
            )}
          </CardContent>
        </Card>

        {/* Milestones & Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Milestones & Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Unlocked Milestones */}
            {unlockedMilestones.length > 0 && (
              <div className="space-y-2">
                {unlockedMilestones.map((milestone) => {
                  const Icon = milestone.icon;
                  return (
                    <div key={milestone.calls} className="flex items-center gap-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Icon className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{milestone.label}</p>
                        <p className="text-xs text-muted-foreground">{milestone.description}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto bg-green-500/20 text-green-500 border-green-500/30">
                        Unlocked
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next Milestone Progress */}
            {nextMilestone && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Next: {nextMilestone.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {metrics?.totalCalls || 0} / {nextMilestone.calls} calls
                  </span>
                </div>
                <Progress 
                  value={((metrics?.totalCalls || 0) / nextMilestone.calls) * 100} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Call Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Top Performing Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentHighlights.map((call, index) => (
              <div key={call.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${getScoreBgColor(call.overall_score || 0)} ${getScoreColor(call.overall_score || 0)}`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${getScoreColor(call.overall_score || 0)}`}>
                      {call.overall_score?.toFixed(1)}/10
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {call.call_category?.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(call.analyzed_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {call.transcript_summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {call.transcript_summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}