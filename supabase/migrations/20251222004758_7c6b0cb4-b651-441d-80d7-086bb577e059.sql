-- Create email_events table for tracking opens and clicks
CREATE TABLE public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click')),
  url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_email_events_lead_id ON public.email_events(lead_id);
CREATE INDEX idx_email_events_email_id ON public.email_events(email_id);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_created_at ON public.email_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Allow public insert for tracking (edge functions will insert)
CREATE POLICY "Allow public insert on email_events"
ON public.email_events
FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read on email_events"
ON public.email_events
FOR SELECT
USING (true);

-- Add lead_id column to emails table for linking
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON public.emails(lead_id);