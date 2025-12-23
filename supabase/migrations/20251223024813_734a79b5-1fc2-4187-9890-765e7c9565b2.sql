-- Create scheduled_follow_ups table for auto-send mode
CREATE TABLE public.scheduled_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id text NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('email', 'sms', 'call_reminder')),
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  auto_approved boolean NOT NULL DEFAULT false,
  message_subject text,
  message_body text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient querying of pending scheduled follow-ups
CREATE INDEX idx_scheduled_follow_ups_pending ON public.scheduled_follow_ups (scheduled_for) 
WHERE sent_at IS NULL AND cancelled_at IS NULL;

-- Create index for lead-based queries
CREATE INDEX idx_scheduled_follow_ups_lead ON public.scheduled_follow_ups (lead_id);

-- Enable RLS
ALTER TABLE public.scheduled_follow_ups ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY scheduled_follow_ups_admin_all ON public.scheduled_follow_ups
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Policy: Authenticated users can view their own scheduled follow-ups
CREATE POLICY scheduled_follow_ups_user_select ON public.scheduled_follow_ups
FOR SELECT
USING (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Policy: Authenticated users can create their own scheduled follow-ups
CREATE POLICY scheduled_follow_ups_user_insert ON public.scheduled_follow_ups
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Policy: Authenticated users can update their own scheduled follow-ups (cancel, etc.)
CREATE POLICY scheduled_follow_ups_user_update ON public.scheduled_follow_ups
FOR UPDATE
USING (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Policy: Authenticated users can delete their own scheduled follow-ups
CREATE POLICY scheduled_follow_ups_user_delete ON public.scheduled_follow_ups
FOR DELETE
USING (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Add auto_send_enabled to system_settings if not exists
INSERT INTO public.system_settings (key, value, description)
VALUES ('auto_send_follow_ups_enabled', 'true', 'Global toggle to enable/disable auto-send follow-ups feature')
ON CONFLICT (key) DO NOTHING;