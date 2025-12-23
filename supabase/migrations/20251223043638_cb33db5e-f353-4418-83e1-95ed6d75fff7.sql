-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL DEFAULT 'custom',
  configuration JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  schedule_frequency TEXT,
  schedule_recipients TEXT[],
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_runs table
CREATE TABLE public.report_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  run_by UUID REFERENCES auth.users(id),
  run_type TEXT NOT NULL DEFAULT 'manual',
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  row_count INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create dashboards table
CREATE TABLE public.dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '{}',
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dashboard_widgets table
CREATE TABLE public.dashboard_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE NOT NULL,
  widget_type TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 4,
  height INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Users can view own and global reports" ON public.reports
  FOR SELECT USING (auth.uid() = created_by OR is_global = true);

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own reports" ON public.reports
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own reports" ON public.reports
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for report_runs
CREATE POLICY "Users can view report runs" ON public.report_runs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create report runs" ON public.report_runs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own report runs" ON public.report_runs
  FOR UPDATE USING (auth.uid() = run_by);

-- RLS Policies for dashboards
CREATE POLICY "Users can view own and public dashboards" ON public.dashboards
  FOR SELECT USING (auth.uid() = owner_id OR is_public = true);

CREATE POLICY "Users can create dashboards" ON public.dashboards
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own dashboards" ON public.dashboards
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own dashboards" ON public.dashboards
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for dashboard_widgets
CREATE POLICY "Users can view dashboard widgets" ON public.dashboard_widgets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage widgets on own dashboards" ON public.dashboard_widgets
  FOR ALL USING (
    dashboard_id IN (SELECT id FROM public.dashboards WHERE owner_id = auth.uid())
  );

-- Create indexes
CREATE INDEX idx_reports_created_by ON public.reports(created_by);
CREATE INDEX idx_reports_type ON public.reports(report_type);
CREATE INDEX idx_report_runs_report_id ON public.report_runs(report_id);
CREATE INDEX idx_dashboards_owner ON public.dashboards(owner_id);
CREATE INDEX idx_dashboard_widgets_dashboard ON public.dashboard_widgets(dashboard_id);