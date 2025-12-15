import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown, Phone, AlertTriangle, Target, BarChart3, Eye, Download } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PatternInsights } from "@/components/admin/quality/PatternInsights";
import { CategoryBreakdown } from "@/components/admin/quality/CategoryBreakdown";

interface CallAnalysis {
  id: string;
  call_id: string;
  customer_id: string;
  analyzed_at: string;
  overall_score: number;
  score_speed: number;
  score_clarity: number;
  score_accuracy: number;
  score_tone: number;
  score_completeness: number;
  score_lead_quality: number;
  score_booking_success: number;
  score_objection_handling: number;
  score_call_duration: number;
  score_outcome_quality: number;
  insights: unknown;
  suggestions: unknown;
  transcript_summary: string;
  call_category: string;
  sentiment: string;
  vapi_calls?: {
    caller_phone: string;
    duration_seconds: number;
    transcript: string;
    customer_profiles?: { business_name: string; business_type: string };
  } | null;
}

const DATE_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const CATEGORIES = ["all", "new_lead", "appointment", "question", "complaint", "follow_up", "emergency", "other"];

export default function QualityInsights() {
  const [dateRange, setDateRange] = useState(30);
  const [category, setCategory] = useState("all");
  const [selectedAnalysis, setSelectedAnalysis] = useState<CallAnalysis | null>(null);

  const startDate = useMemo(() => startOfDay(subDays(new Date(), dateRange)), [dateRange]);
  const endDate = useMemo(() => endOfDay(new Date()), []);

  // Fetch all analyses with call data
  const { data: analyses, isLoading } = useQuery({
    queryKey: ['quality-insights', dateRange, category],
    queryFn: async () => {
      let query = supabase
        .from('call_analysis')
        .select(`
          *,
          vapi_calls (
            caller_phone,
            duration_seconds,
            transcript,
            customer_profiles (business_name, business_type)
          )
        `)
        .gte('analyzed_at', startDate.toISOString())
        .lte('analyzed_at', endDate.toISOString())
        .order('analyzed_at', { ascending: false });

      if (category !== 'all') {
        query = query.eq('call_category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallAnalysis[];
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!analyses?.length) return null;

    const avgScore = analyses.reduce((sum, a) => sum + (a.overall_score || 0), 0) / analyses.length;
    const lowScoreCalls = analyses.filter(a => (a.overall_score || 0) < 6).length;

    // Group by business type for top vertical
    const byVertical: Record<string, { total: number; count: number }> = {};
    analyses.forEach(a => {
      const vertical = a.vapi_calls?.customer_profiles?.business_type || 'Unknown';
      if (!byVertical[vertical]) byVertical[vertical] = { total: 0, count: 0 };
      byVertical[vertical].total += a.overall_score || 0;
      byVertical[vertical].count++;
    });

    const topVertical = Object.entries(byVertical)
      .map(([name, data]) => ({ name, avgScore: data.total / data.count, count: data.count }))
      .sort((a, b) => b.avgScore - a.avgScore)[0];

    // Metric averages
    const metricAvgs = {
      speed: analyses.reduce((sum, a) => sum + (a.score_speed || 0), 0) / analyses.length,
      clarity: analyses.reduce((sum, a) => sum + (a.score_clarity || 0), 0) / analyses.length,
      accuracy: analyses.reduce((sum, a) => sum + (a.score_accuracy || 0), 0) / analyses.length,
      tone: analyses.reduce((sum, a) => sum + (a.score_tone || 0), 0) / analyses.length,
      completeness: analyses.reduce((sum, a) => sum + (a.score_completeness || 0), 0) / analyses.length,
      lead_quality: analyses.reduce((sum, a) => sum + (a.score_lead_quality || 0), 0) / analyses.length,
      booking_success: analyses.reduce((sum, a) => sum + (a.score_booking_success || 0), 0) / analyses.length,
      objection_handling: analyses.reduce((sum, a) => sum + (a.score_objection_handling || 0), 0) / analyses.length,
      call_duration: analyses.reduce((sum, a) => sum + (a.score_call_duration || 0), 0) / analyses.length,
      outcome_quality: analyses.reduce((sum, a) => sum + (a.score_outcome_quality || 0), 0) / analyses.length,
    };

    return { avgScore, lowScoreCalls, topVertical, metricAvgs, byVertical };
  }, [analyses]);

  // Trend data for line chart
  const trendData = useMemo(() => {
    if (!analyses?.length) return [];

    const byDate: Record<string, { total: number; count: number }> = {};
    analyses.forEach(a => {
      const date = format(new Date(a.analyzed_at), 'MMM d');
      if (!byDate[date]) byDate[date] = { total: 0, count: 0 };
      byDate[date].total += a.overall_score || 0;
      byDate[date].count++;
    });

    return Object.entries(byDate)
      .map(([date, data]) => ({ date, score: data.total / data.count }))
      .reverse();
  }, [analyses]);

  // Metric bar data
  const metricBarData = useMemo(() => {
    if (!metrics?.metricAvgs) return [];
    return [
      { name: 'Speed', score: metrics.metricAvgs.speed },
      { name: 'Clarity', score: metrics.metricAvgs.clarity },
      { name: 'Accuracy', score: metrics.metricAvgs.accuracy },
      { name: 'Tone', score: metrics.metricAvgs.tone },
      { name: 'Completeness', score: metrics.metricAvgs.completeness },
      { name: 'Lead Quality', score: metrics.metricAvgs.lead_quality },
      { name: 'Booking', score: metrics.metricAvgs.booking_success },
      { name: 'Objections', score: metrics.metricAvgs.objection_handling },
      { name: 'Duration', score: metrics.metricAvgs.call_duration },
      { name: 'Outcome', score: metrics.metricAvgs.outcome_quality },
    ];
  }, [metrics]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'hsl(142, 76%, 36%)';
    if (score >= 6) return 'hsl(45, 93%, 47%)';
    return 'hsl(0, 84%, 60%)';
  };

  const getScoreClass = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/20 text-green-400';
      case 'negative': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleExportCSV = () => {
    if (!analyses?.length) return;
    
    const headers = ['Date', 'Customer', 'Vertical', 'Overall Score', 'Category', 'Sentiment', 'Duration'];
    const rows = analyses.map(a => [
      format(new Date(a.analyzed_at), 'yyyy-MM-dd HH:mm'),
      a.vapi_calls?.customer_profiles?.business_name || 'Unknown',
      a.vapi_calls?.customer_profiles?.business_type || 'Unknown',
      a.overall_score?.toFixed(1),
      a.call_category,
      a.sentiment,
      `${a.vapi_calls?.duration_seconds || 0}s`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quality-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AI Quality Insights</h1>
            <p className="text-muted-foreground">Analyze call quality across all customers</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={String(dateRange)} onValueChange={(v) => setDateRange(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map(r => (
                  <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Average Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreClass(metrics?.avgScore || 0)}`}>
                {metrics?.avgScore?.toFixed(1) || '—'}/10
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {analyses?.length || 0} analyzed calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Total Calls Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analyses?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In the last {dateRange} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Performing Vertical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{metrics?.topVertical?.name || '—'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.topVertical?.avgScore?.toFixed(1) || '—'}/10 avg ({metrics?.topVertical?.count || 0} calls)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{metrics?.lowScoreCalls || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Calls scored below 6.0
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quality Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 10]} className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metric Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Score by Metric</CardTitle>
            </CardHeader>
            <CardContent>
              {metricBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metricBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 10]} className="text-xs" />
                    <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {metricBarData.map((entry, index) => (
                        <Cell key={index} fill={getScoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pattern Detection & Auto-Suggestions */}
        {analyses && analyses.length > 0 && (
          <PatternInsights analyses={analyses} />
        )}

        {/* Category Breakdown */}
        {analyses && analyses.length > 0 && (
          <CategoryBreakdown analyses={analyses} />
        )}

        {/* Recent Calls Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Call Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyses?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No analyzed calls found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses?.slice(0, 20).map((analysis) => (
                    <TableRow key={analysis.id}>
                      <TableCell className="text-sm">
                        {format(new Date(analysis.analyzed_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {analysis.vapi_calls?.customer_profiles?.business_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {analysis.vapi_calls?.customer_profiles?.business_type || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${getScoreClass(analysis.overall_score || 0)}`}>
                          {analysis.overall_score?.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{analysis.call_category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSentimentColor(analysis.sentiment)}>
                          {analysis.sentiment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {analysis.vapi_calls?.duration_seconds || 0}s
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAnalysis(analysis)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Call Details Modal */}
        <Dialog open={!!selectedAnalysis} onOpenChange={() => setSelectedAnalysis(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span>{selectedAnalysis?.vapi_calls?.customer_profiles?.business_name || 'Call Analysis'}</span>
                <Badge variant="outline">
                  {selectedAnalysis?.vapi_calls?.customer_profiles?.business_type}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            {selectedAnalysis && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                    <p className={`text-4xl font-bold ${getScoreClass(selectedAnalysis.overall_score || 0)}`}>
                      {selectedAnalysis.overall_score?.toFixed(1)}/10
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getSentimentColor(selectedAnalysis.sentiment)}>
                      {selectedAnalysis.sentiment}
                    </Badge>
                    <Badge variant="secondary">{selectedAnalysis.call_category}</Badge>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Speed', score: selectedAnalysis.score_speed },
                    { label: 'Clarity', score: selectedAnalysis.score_clarity },
                    { label: 'Accuracy', score: selectedAnalysis.score_accuracy },
                    { label: 'Tone', score: selectedAnalysis.score_tone },
                    { label: 'Completeness', score: selectedAnalysis.score_completeness },
                    { label: 'Lead Quality', score: selectedAnalysis.score_lead_quality },
                    { label: 'Booking', score: selectedAnalysis.score_booking_success },
                    { label: 'Objections', score: selectedAnalysis.score_objection_handling },
                    { label: 'Duration', score: selectedAnalysis.score_call_duration },
                    { label: 'Outcome', score: selectedAnalysis.score_outcome_quality },
                  ].map(({ label, score }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span className={getScoreClass(score || 0)}>{score}/10</span>
                      </div>
                      <Progress value={(score || 0) * 10} className="h-2" />
                    </div>
                  ))}
                </div>

                {/* Summary */}
                {selectedAnalysis.transcript_summary && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Summary</p>
                    <p className="text-sm">{selectedAnalysis.transcript_summary}</p>
                  </div>
                )}

                {/* Insights */}
                {selectedAnalysis.insights && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {(() => {
                      const insights = selectedAnalysis.insights as { strengths?: string[]; weaknesses?: string[]; notable_moments?: string[] } | null;
                      return (
                        <>
                          {insights?.strengths && insights.strengths.length > 0 && (
                            <div className="p-4 bg-green-500/10 rounded-lg">
                              <p className="text-sm font-medium text-green-500 mb-2">Strengths</p>
                              <ul className="text-sm space-y-1">
                                {insights.strengths.map((s, i) => (
                                  <li key={i}>• {s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {insights?.weaknesses && insights.weaknesses.length > 0 && (
                            <div className="p-4 bg-red-500/10 rounded-lg">
                              <p className="text-sm font-medium text-red-500 mb-2">Weaknesses</p>
                              <ul className="text-sm space-y-1">
                                {insights.weaknesses.map((w, i) => (
                                  <li key={i}>• {w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Suggestions */}
                {(() => {
                  const suggestions = selectedAnalysis.suggestions as Array<{ category: string; issue: string; fix: string; priority: string }> | null;
                  if (!suggestions || suggestions.length === 0) return null;
                  return (
                    <div>
                      <p className="text-sm font-medium mb-3">Improvement Suggestions</p>
                      <div className="space-y-3">
                        {suggestions.map((s, i) => (
                          <div key={i} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{s.category}</Badge>
                              <Badge variant={s.priority === 'high' ? 'destructive' : 'secondary'}>
                                {s.priority}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{s.issue}</p>
                            <p className="text-sm text-muted-foreground">{s.fix}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
