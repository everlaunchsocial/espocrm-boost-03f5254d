import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, subDays, format } from 'date-fns';

interface SessionData {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  actions_count: number;
  errors_count: number;
  user_role: string | null;
  page_route: string | null;
}

interface ActionData {
  id: string;
  session_id: string;
  action_type: string;
  parameters: Record<string, any>;
  success: boolean;
  error_message: string | null;
  executed_at: string;
  response_time_ms: number | null;
  user_transcript: string | null;
  ai_response: string | null;
}

interface UsageStats {
  totalSessionsWeek: number;
  totalSessionsMonth: number;
  avgDurationSeconds: number;
  totalActions: number;
  successRate: number;
  topUsers: { user_id: string; session_count: number; email?: string }[];
}

interface ActionBreakdown {
  action_type: string;
  count: number;
  success_count: number;
  avg_response_time: number;
}

interface DailyUsage {
  date: string;
  sessions: number;
  unique_users: number;
}

interface TopCommand {
  action_type: string;
  count: number;
  success_rate: number;
  avg_response_time: number;
}

interface ErrorAnalysis {
  action_type: string;
  error_count: number;
  total_count: number;
  failure_rate: number;
  recent_errors: { error_message: string; executed_at: string }[];
}

export function useAIAssistantAnalytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date()
  });
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [actionBreakdown, setActionBreakdown] = useState<ActionBreakdown[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [topCommands, setTopCommands] = useState<TopCommand[]>([]);
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(dateRange.start, 'yyyy-MM-dd');
      const endDate = format(dateRange.end, 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

      // Fetch sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('ai_assistant_sessions')
        .select('*')
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59.999Z')
        .order('started_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch actions
      const { data: actions, error: actionsError } = await supabase
        .from('ai_assistant_actions')
        .select('*')
        .gte('executed_at', startDate)
        .lte('executed_at', endDate + 'T23:59:59.999Z');

      if (actionsError) throw actionsError;

      // Calculate usage stats
      const weekSessions = (sessions || []).filter(s => s.started_at >= weekStart);
      const monthSessions = (sessions || []).filter(s => s.started_at >= monthStart);
      const completedSessions = (sessions || []).filter(s => s.duration_seconds);
      const avgDuration = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / completedSessions.length
        : 0;

      const totalActions = actions?.length || 0;
      const successfulActions = (actions || []).filter(a => a.success).length;
      const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;

      // Top users
      const userCounts: Record<string, number> = {};
      (sessions || []).forEach(s => {
        userCounts[s.user_id] = (userCounts[s.user_id] || 0) + 1;
      });
      const topUsers = Object.entries(userCounts)
        .map(([user_id, session_count]) => ({ user_id, session_count }))
        .sort((a, b) => b.session_count - a.session_count)
        .slice(0, 5);

      setUsageStats({
        totalSessionsWeek: weekSessions.length,
        totalSessionsMonth: monthSessions.length,
        avgDurationSeconds: Math.round(avgDuration),
        totalActions,
        successRate: Math.round(successRate * 10) / 10,
        topUsers
      });

      // Action breakdown
      const actionCounts: Record<string, { count: number; success: number; totalTime: number }> = {};
      (actions || []).forEach(a => {
        if (!actionCounts[a.action_type]) {
          actionCounts[a.action_type] = { count: 0, success: 0, totalTime: 0 };
        }
        actionCounts[a.action_type].count++;
        if (a.success) actionCounts[a.action_type].success++;
        if (a.response_time_ms) actionCounts[a.action_type].totalTime += a.response_time_ms;
      });

      const breakdown = Object.entries(actionCounts)
        .map(([action_type, data]) => ({
          action_type,
          count: data.count,
          success_count: data.success,
          avg_response_time: data.count > 0 ? Math.round(data.totalTime / data.count) : 0
        }))
        .sort((a, b) => b.count - a.count);

      setActionBreakdown(breakdown);

      // Daily usage
      const dailyCounts: Record<string, { sessions: Set<string>; users: Set<string> }> = {};
      (sessions || []).forEach(s => {
        const date = format(new Date(s.started_at), 'yyyy-MM-dd');
        if (!dailyCounts[date]) {
          dailyCounts[date] = { sessions: new Set(), users: new Set() };
        }
        dailyCounts[date].sessions.add(s.id);
        dailyCounts[date].users.add(s.user_id);
      });

      const daily = Object.entries(dailyCounts)
        .map(([date, data]) => ({
          date,
          sessions: data.sessions.size,
          unique_users: data.users.size
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyUsage(daily);

      // Top commands
      const commands = breakdown.map(b => ({
        action_type: b.action_type,
        count: b.count,
        success_rate: b.count > 0 ? Math.round((b.success_count / b.count) * 100) : 0,
        avg_response_time: b.avg_response_time
      }));
      setTopCommands(commands);

      // Error analysis
      const errorsByType: Record<string, { errors: { error_message: string; executed_at: string }[]; total: number }> = {};
      (actions || []).forEach(a => {
        if (!errorsByType[a.action_type]) {
          errorsByType[a.action_type] = { errors: [], total: 0 };
        }
        errorsByType[a.action_type].total++;
        if (!a.success && a.error_message) {
          errorsByType[a.action_type].errors.push({
            error_message: a.error_message,
            executed_at: a.executed_at
          });
        }
      });

      const errors = Object.entries(errorsByType)
        .filter(([_, data]) => data.errors.length > 0)
        .map(([action_type, data]) => ({
          action_type,
          error_count: data.errors.length,
          total_count: data.total,
          failure_rate: Math.round((data.errors.length / data.total) * 100),
          recent_errors: data.errors.slice(0, 5)
        }))
        .sort((a, b) => b.error_count - a.error_count);

      setErrorAnalysis(errors);

    } catch (error) {
      console.error('Error fetching AI assistant analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportToCSV = useCallback(() => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Sessions (Week)', usageStats?.totalSessionsWeek || 0],
      ['Total Sessions (Month)', usageStats?.totalSessionsMonth || 0],
      ['Average Duration (seconds)', usageStats?.avgDurationSeconds || 0],
      ['Total Actions', usageStats?.totalActions || 0],
      ['Success Rate (%)', usageStats?.successRate || 0],
      [''],
      ['Action Type', 'Count', 'Success Rate', 'Avg Response Time (ms)'],
      ...topCommands.map(c => [c.action_type, c.count, c.success_rate, c.avg_response_time])
    ];

    const csvContent = rows.map(row => 
      Array.isArray(row) ? row.join(',') : row
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ai_assistant_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  }, [usageStats, topCommands]);

  return {
    loading,
    dateRange,
    setDateRange,
    usageStats,
    actionBreakdown,
    dailyUsage,
    topCommands,
    errorAnalysis,
    exportToCSV,
    refetch: fetchAnalytics
  };
}
