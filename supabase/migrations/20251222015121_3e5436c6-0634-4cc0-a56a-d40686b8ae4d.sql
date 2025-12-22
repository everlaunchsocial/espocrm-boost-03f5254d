-- Create table for manual follow-up entries
CREATE TABLE public.manual_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active',
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_manual_follow_ups_lead_id ON public.manual_follow_ups(lead_id);
CREATE INDEX idx_manual_follow_ups_status ON public.manual_follow_ups(status);

-- Enable RLS
ALTER TABLE public.manual_follow_ups ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public access (matching existing patterns)
CREATE POLICY "Allow public access on manual_follow_ups" 
  ON public.manual_follow_ups 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);