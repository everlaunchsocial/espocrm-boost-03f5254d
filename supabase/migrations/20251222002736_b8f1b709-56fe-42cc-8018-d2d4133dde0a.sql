-- Create table for caching lead timeline summaries
CREATE TABLE public.lead_timeline_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_timeline_summaries ENABLE ROW LEVEL SECURITY;

-- Allow public access (matching leads table pattern)
CREATE POLICY "Allow public access on lead_timeline_summaries"
ON public.lead_timeline_summaries
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX idx_lead_timeline_summaries_lead_id ON public.lead_timeline_summaries(lead_id);

-- Add trigger for updated_at
CREATE TRIGGER update_lead_timeline_summaries_updated_at
  BEFORE UPDATE ON public.lead_timeline_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();