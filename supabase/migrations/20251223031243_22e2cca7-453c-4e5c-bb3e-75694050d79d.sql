-- Create campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL CHECK (campaign_type IN ('nurture', 'reactivation', 'onboarding', 'custom')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  target_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create campaign_steps table
CREATE TABLE public.campaign_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  step_number integer NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'call_reminder', 'task')),
  delay_days integer NOT NULL DEFAULT 0,
  delay_hours integer NOT NULL DEFAULT 0,
  message_template text NOT NULL,
  subject_template text,
  conditions jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, step_number)
);

-- Create campaign_enrollments table
CREATE TABLE public.campaign_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  current_step integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped', 'failed')),
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  stopped_at timestamp with time zone,
  stopped_reason text,
  UNIQUE(campaign_id, lead_id)
);

-- Create campaign_executions table
CREATE TABLE public.campaign_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.campaign_enrollments(id) ON DELETE CASCADE NOT NULL,
  step_id uuid REFERENCES public.campaign_steps(id) ON DELETE CASCADE NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  executed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_affiliate ON public.campaigns(affiliate_id);
CREATE INDEX idx_campaign_steps_campaign ON public.campaign_steps(campaign_id);
CREATE INDEX idx_campaign_enrollments_campaign ON public.campaign_enrollments(campaign_id);
CREATE INDEX idx_campaign_enrollments_lead ON public.campaign_enrollments(lead_id);
CREATE INDEX idx_campaign_enrollments_status ON public.campaign_enrollments(status);
CREATE INDEX idx_campaign_executions_enrollment ON public.campaign_executions(enrollment_id);
CREATE INDEX idx_campaign_executions_pending ON public.campaign_executions(scheduled_for, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_executions ENABLE ROW LEVEL SECURITY;

-- RLS for campaigns
CREATE POLICY "campaigns_admin_all" ON public.campaigns
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "campaigns_authenticated_select" ON public.campaigns
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "campaigns_authenticated_insert" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "campaigns_owner_update" ON public.campaigns
  FOR UPDATE USING (created_by = auth.uid() OR is_admin());

-- RLS for campaign_steps
CREATE POLICY "campaign_steps_admin_all" ON public.campaign_steps
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "campaign_steps_authenticated_select" ON public.campaign_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "campaign_steps_authenticated_insert" ON public.campaign_steps
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "campaign_steps_authenticated_update" ON public.campaign_steps
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "campaign_steps_authenticated_delete" ON public.campaign_steps
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS for campaign_enrollments
CREATE POLICY "campaign_enrollments_admin_all" ON public.campaign_enrollments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "campaign_enrollments_authenticated_select" ON public.campaign_enrollments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "campaign_enrollments_authenticated_insert" ON public.campaign_enrollments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "campaign_enrollments_authenticated_update" ON public.campaign_enrollments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS for campaign_executions
CREATE POLICY "campaign_executions_admin_all" ON public.campaign_executions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "campaign_executions_authenticated_select" ON public.campaign_executions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Update trigger for campaigns
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();