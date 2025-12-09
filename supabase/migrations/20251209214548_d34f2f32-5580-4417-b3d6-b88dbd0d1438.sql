-- Create signup_events table for tracking affiliate signup abandonment
CREATE TABLE public.signup_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  username text,
  plan text,
  referrer text,
  event_name text NOT NULL,
  step text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signup_events ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (including anonymous)
CREATE POLICY "anyone_can_insert_signup_events" ON public.signup_events FOR INSERT WITH CHECK (true);

-- Only admins can read
CREATE POLICY "admins_can_read_signup_events" ON public.signup_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND global_role IN ('admin', 'super_admin'))
);