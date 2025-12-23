import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface Report {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  configuration: Record<string, unknown>;
  created_by: string;
  is_global: boolean;
  is_scheduled: boolean;
  schedule_frequency: string | null;
  schedule_recipients: string[] | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportConfiguration {
  dataSource: 'leads' | 'demos' | 'activities' | 'deals';
  filters: ReportFilter[];
  columns: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportFilter {
  field: string;
  operator: string;
  value: string | string[] | number | boolean;
}

export interface ReportRun {
  id: string;
  report_id: string;
  run_by: string | null;
  run_type: string;
  file_url: string | null;
  status: string;
  error_message: string | null;
  row_count: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  layout: Record<string, unknown>;
  owner_id: string;
  is_default: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  widget_type: string;
  configuration: Record<string, unknown>;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
}

// Report Templates
export const REPORT_TEMPLATES = [
  {
    id: 'pipeline-health',
    name: 'Pipeline Health Report',
    description: 'Leads by stage, conversion rates, and bottleneck identification',
    report_type: 'pipeline',
    configuration: {
      dataSource: 'leads' as const,
      filters: [],
      columns: ['first_name', 'last_name', 'company', 'pipeline_status', 'created_at'],
      groupBy: 'pipeline_status',
      sortBy: 'created_at',
      sortOrder: 'desc' as const,
    },
  },
  {
    id: 'sales-performance',
    name: 'Sales Performance Report',
    description: 'Revenue by period, closed deals, win/loss ratio',
    report_type: 'performance',
    configuration: {
      dataSource: 'deals' as const,
      filters: [{ field: 'stage', operator: 'is', value: 'Closed Won' }],
      columns: ['name', 'amount', 'stage', 'expected_close_date', 'created_at'],
      groupBy: 'stage',
      sortBy: 'amount',
      sortOrder: 'desc' as const,
    },
  },
  {
    id: 'activity-report',
    name: 'Activity Report',
    description: 'Calls made, emails sent, demos delivered, tasks completed',
    report_type: 'activity',
    configuration: {
      dataSource: 'activities' as const,
      filters: [],
      columns: ['type', 'subject', 'created_at', 'related_to_name'],
      groupBy: 'type',
      sortBy: 'created_at',
      sortOrder: 'desc' as const,
    },
  },
  {
    id: 'lead-source',
    name: 'Lead Source Analysis',
    description: 'Leads by source, conversion rate, and best performing sources',
    report_type: 'custom',
    configuration: {
      dataSource: 'leads' as const,
      filters: [],
      columns: ['first_name', 'last_name', 'company', 'source', 'pipeline_status'],
      groupBy: 'source',
      sortBy: 'created_at',
      sortOrder: 'desc' as const,
    },
  },
  {
    id: 'forecast-accuracy',
    name: 'Forecast Accuracy Report',
    description: 'Predicted vs actual revenue and accuracy trends',
    report_type: 'forecast',
    configuration: {
      dataSource: 'deals' as const,
      filters: [],
      columns: ['name', 'amount', 'probability', 'expected_close_date', 'stage'],
      sortBy: 'expected_close_date',
      sortOrder: 'asc' as const,
    },
  },
];

// Reports hooks
export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Report[];
    },
  });
}

export function useReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();
      
      if (error) throw error;
      return data as Report;
    },
    enabled: !!reportId,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: Partial<Report>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reports')
        .insert([{
          name: report.name!,
          description: report.description,
          report_type: report.report_type || 'custom',
          configuration: report.configuration as Json || {},
          created_by: user.id,
          is_global: report.is_global || false,
          is_scheduled: report.is_scheduled || false,
          schedule_frequency: report.schedule_frequency,
          schedule_recipients: report.schedule_recipients,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Report> & { id: string }) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.configuration !== undefined) updateData.configuration = updates.configuration as Json;
      if (updates.is_global !== undefined) updateData.is_global = updates.is_global;
      if (updates.is_scheduled !== undefined) updateData.is_scheduled = updates.is_scheduled;
      if (updates.schedule_frequency !== undefined) updateData.schedule_frequency = updates.schedule_frequency;
      if (updates.schedule_recipients !== undefined) updateData.schedule_recipients = updates.schedule_recipients;
      
      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// Report runs hooks
export function useReportRuns(reportId: string | undefined) {
  return useQuery({
    queryKey: ['report-runs', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('report_runs')
        .select('*')
        .eq('report_id', reportId)
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as ReportRun[];
    },
    enabled: !!reportId,
  });
}

export function useRunReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create a new run record
      const { data: run, error: runError } = await supabase
        .from('report_runs')
        .insert({
          report_id: reportId,
          run_by: user.id,
          run_type: 'manual',
          status: 'running',
        })
        .select()
        .single();
      
      if (runError) throw runError;

      // Get the report configuration
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();
      
      if (reportError) throw reportError;

      // Execute the report based on configuration
      const config = report.configuration as unknown as ReportConfiguration;
      let query;
      let rowCount = 0;

      try {
        switch (config.dataSource) {
          case 'leads':
            const { data: leads, error: leadsError } = await supabase
              .from('leads')
              .select('*')
              .order(config.sortBy || 'created_at', { ascending: config.sortOrder === 'asc' });
            if (leadsError) throw leadsError;
            rowCount = leads?.length || 0;
            break;
          case 'deals':
            const { data: deals, error: dealsError } = await supabase
              .from('deals')
              .select('*')
              .order(config.sortBy || 'created_at', { ascending: config.sortOrder === 'asc' });
            if (dealsError) throw dealsError;
            rowCount = deals?.length || 0;
            break;
          case 'activities':
            const { data: activities, error: activitiesError } = await supabase
              .from('activities')
              .select('*')
              .order(config.sortBy || 'created_at', { ascending: config.sortOrder === 'asc' });
            if (activitiesError) throw activitiesError;
            rowCount = activities?.length || 0;
            break;
        }

        // Update run as completed
        await supabase
          .from('report_runs')
          .update({
            status: 'completed',
            row_count: rowCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', run.id);

        // Update report last_run_at
        await supabase
          .from('reports')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', reportId);

      } catch (error) {
        await supabase
          .from('report_runs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', run.id);
        throw error;
      }

      return run;
    },
    onSuccess: (_, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['report-runs', reportId] });
    },
  });
}

// Dashboard hooks
export function useDashboards() {
  return useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Dashboard[];
    },
  });
}

export function useDashboard(dashboardId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: async () => {
      if (!dashboardId) return null;
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', dashboardId)
        .single();
      
      if (error) throw error;
      return data as Dashboard;
    },
    enabled: !!dashboardId,
  });
}

export function useDashboardWidgets(dashboardId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-widgets', dashboardId],
    queryFn: async () => {
      if (!dashboardId) return [];
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true });
      
      if (error) throw error;
      return data as DashboardWidget[];
    },
    enabled: !!dashboardId,
  });
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboard: Partial<Dashboard>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('dashboards')
        .insert([{
          name: dashboard.name!,
          description: dashboard.description,
          layout: (dashboard.layout || {}) as Json,
          owner_id: user.id,
          is_default: dashboard.is_default || false,
          is_public: dashboard.is_public || false,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardId: string) => {
      const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', dashboardId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
}

// Report data fetching for preview
export function useReportData(config: ReportConfiguration | null) {
  return useQuery({
    queryKey: ['report-data', config],
    queryFn: async () => {
      if (!config) return { data: [], summary: {} };

      let data: Record<string, unknown>[] = [];
      let summary: Record<string, unknown> = {};

      switch (config.dataSource) {
        case 'leads':
          const { data: leads } = await supabase
            .from('leads')
            .select('*')
            .order(config.sortBy || 'created_at', { ascending: config.sortOrder === 'asc' })
            .limit(1000);
          data = leads || [];
          summary = {
            total: data.length,
            byStatus: groupBy(data, 'pipeline_status'),
          };
          break;
        case 'deals':
          const { data: deals } = await supabase
            .from('deals')
            .select('*')
            .order(config.sortBy || 'created_at', { ascending: config.sortOrder === 'asc' })
            .limit(1000);
          data = deals || [];
          const totalRevenue = data.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
          summary = {
            total: data.length,
            totalRevenue,
            avgDealSize: data.length > 0 ? totalRevenue / data.length : 0,
            byStage: groupBy(data, 'stage'),
          };
          break;
        case 'activities':
          const { data: activities } = await supabase
            .from('activities')
            .select('*')
            .order(config.sortBy || 'created_at', { ascending: config.sortOrder === 'asc' })
            .limit(1000);
          data = activities || [];
          summary = {
            total: data.length,
            byType: groupBy(data, 'type'),
          };
          break;
      }

      return { data, summary };
    },
    enabled: !!config,
  });
}

function groupBy(arr: Record<string, unknown>[], key: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const group = String(item[key] || 'Unknown');
    result[group] = (result[group] || 0) + 1;
  }
  return result;
}

// Export utilities
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return String(val);
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}
