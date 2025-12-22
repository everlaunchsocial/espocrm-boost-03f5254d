-- Create table to track resolved follow-up suggestions
CREATE TABLE public.follow_up_resolutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_key TEXT NOT NULL,
  lead_id UUID NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate resolutions
CREATE UNIQUE INDEX idx_follow_up_resolutions_unique ON public.follow_up_resolutions(suggestion_key);

-- Create index for lead lookups
CREATE INDEX idx_follow_up_resolutions_lead_id ON public.follow_up_resolutions(lead_id);

-- Enable RLS
ALTER TABLE public.follow_up_resolutions ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (matches other CRM tables)
CREATE POLICY "Allow public access on follow_up_resolutions"
  ON public.follow_up_resolutions
  FOR ALL
  USING (true)
  WITH CHECK (true);