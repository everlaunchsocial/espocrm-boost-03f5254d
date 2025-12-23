-- Add AI-related columns to existing tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMP WITH TIME ZONE;

-- Create task_templates table
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'custom',
  default_priority TEXT NOT NULL DEFAULT 'medium',
  default_duration_minutes INTEGER DEFAULT 30,
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_task_type CHECK (task_type IN ('call', 'email', 'demo', 'follow_up', 'meeting', 'administrative', 'custom')),
  CONSTRAINT valid_priority CHECK (default_priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Enable RLS on task_templates
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_templates
CREATE POLICY "task_templates_admin_all" ON public.task_templates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "task_templates_authenticated_select" ON public.task_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert pre-built task templates
INSERT INTO public.task_templates (name, description, task_type, default_priority, default_duration_minutes, trigger_conditions)
VALUES 
  ('Follow up on demo view', 'Contact lead after they viewed the demo', 'call', 'high', 15, '{"trigger": "demo_viewed", "delay_hours": 2}'::jsonb),
  ('Send pricing after price question', 'Send pricing info when pricing was discussed', 'email', 'high', 15, '{"trigger": "price_mentioned", "same_day": true}'::jsonb),
  ('Weekly check-in for active leads', 'Regular touch point with active leads', 'call', 'medium', 15, '{"trigger": "no_contact_days", "days": 7, "status": "contacted"}'::jsonb),
  ('Re-engage cold lead', 'Reach out to dormant leads', 'email', 'low', 20, '{"trigger": "no_contact_days", "days": 30, "status": "cold"}'::jsonb),
  ('Competitor mention follow-up', 'Follow up when competitor was mentioned', 'call', 'high', 20, '{"trigger": "competitor_mentioned"}'::jsonb),
  ('Send contract to hot lead', 'Close deal with highly interested lead', 'email', 'urgent', 30, '{"trigger": "hot_lead", "sentiment_threshold": 0.7}'::jsonb),
  ('Prepare for scheduled call', 'Review lead info before call', 'administrative', 'medium', 15, '{"trigger": "call_scheduled", "hours_before": 1}'::jsonb),
  ('Follow up unopened email', 'Re-engage leads who did not open email', 'email', 'medium', 10, '{"trigger": "email_not_opened", "days": 3}'::jsonb);

-- Create indexes
CREATE INDEX idx_tasks_is_auto_generated ON public.tasks(is_auto_generated) WHERE is_auto_generated = true;
CREATE INDEX idx_tasks_task_type ON public.tasks(task_type);
CREATE INDEX idx_task_templates_is_active ON public.task_templates(is_active) WHERE is_active = true;