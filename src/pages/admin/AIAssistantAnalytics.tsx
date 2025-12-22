import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Mic,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Download,
  AlertTriangle,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useAIAssistantAnalytics } from '@/hooks/useAIAssistantAnalytics';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Navigate } from 'react-router-dom';

export default function AIAssistantAnalytics() {
  const { flags } = useFeatureFlags();
  
  const {
    loading,
    dateRange,
    setDateRange,
    usageStats,
    actionBreakdown,
    dailyUsage,
    topCommands,
    errorAnalysis,
    exportToCSV,
    refetch
  } = useAIAssistantAnalytics();

  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  if (!flags.aiCrmPhase3) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDateRangeChange = () => {
    setDateRange({
      start: new Date(startDate),
      end: new Date(endDate)
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const chartColors = {
    primary: 'hsl(217, 91%, 60%)',
    success: 'hsl(142, 71%, 45%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    muted: 'hsl(215, 16%, 47%)'
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            AI Assistant Analytics
          </h1>
          <p className="text-muted-foreground">Track usage and performance across the team</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
            <Button variant="outline" size="sm" onClick={handleDateRangeChange}>
              Apply
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Activity className="h-4 w-4" />
                  Sessions (Week)
                </div>
                <div className="text-2xl font-bold mt-1">
                  {usageStats?.totalSessionsWeek || 0}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <TrendingUp className="h-4 w-4" />
                  Sessions (Month)
                </div>
                <div className="text-2xl font-bold mt-1">
                  {usageStats?.totalSessionsMonth || 0}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  Avg Duration
                </div>
                <div className="text-2xl font-bold mt-1">
                  {formatDuration(usageStats?.avgDurationSeconds || 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Total Actions
                </div>
                <div className="text-2xl font-bold mt-1">
                  {usageStats?.totalActions || 0}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Success Rate
                </div>
                <div className="text-2xl font-bold mt-1 text-success">
                  {usageStats?.successRate || 0}%
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Action Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Action Breakdown</CardTitle>
            <CardDescription>Frequency of each tool used</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={actionBreakdown.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="action_type" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.replace(/_/g, ' ')}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Success']}
                    labelFormatter={(label) => label.replace(/_/g, ' ')}
                  />
                  <Legend />
                  <Bar dataKey="count" fill={chartColors.primary} name="Total" />
                  <Bar dataKey="success_count" fill={chartColors.success} name="Successful" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* User Engagement Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Engagement</CardTitle>
            <CardDescription>Sessions and unique users over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sessions" 
                    stroke={chartColors.primary} 
                    name="Sessions"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="unique_users" 
                    stroke={chartColors.success} 
                    name="Unique Users"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Commands Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Commands</CardTitle>
            <CardDescription>Most frequently used actions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCommands.slice(0, 10).map((cmd) => (
                    <TableRow key={cmd.action_type}>
                      <TableCell className="font-medium">
                        {cmd.action_type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-right">{cmd.count}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={cmd.success_rate >= 80 ? 'default' : cmd.success_rate >= 50 ? 'secondary' : 'destructive'}>
                          {cmd.success_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {cmd.avg_response_time}ms
                      </TableCell>
                    </TableRow>
                  ))}
                  {topCommands.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No actions recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Most Active Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Most Active Users
            </CardTitle>
            <CardDescription>Top 5 users by session count</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-4">
                {usageStats?.topUsers.map((user, idx) => (
                  <div key={user.user_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">
                        {user.user_id.slice(0, 8)}...
                      </span>
                    </div>
                    <Badge variant="outline">{user.session_count} sessions</Badge>
                  </div>
                ))}
                {(!usageStats?.topUsers || usageStats.topUsers.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No users yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Error Analysis
          </CardTitle>
          <CardDescription>Common error types and failure rates</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action Type</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Failure Rate</TableHead>
                  <TableHead>Recent Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorAnalysis.map((err) => (
                  <TableRow key={err.action_type}>
                    <TableCell className="font-medium">
                      {err.action_type.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-destructive">{err.error_count}</span>
                    </TableCell>
                    <TableCell className="text-right">{err.total_count}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{err.failure_rate}%</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                      {err.recent_errors[0]?.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {errorAnalysis.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                      No errors recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
