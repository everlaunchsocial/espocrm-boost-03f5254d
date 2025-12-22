-- Create table for AI timeline highlights/summaries
CREATE TABLE public.lead_timeline_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  event_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_timeline_highlights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "lead_timeline_highlights_public_read" 
ON public.lead_timeline_highlights 
FOR SELECT 
USING (true);

CREATE POLICY "lead_timeline_highlights_public_insert" 
ON public.lead_timeline_highlights 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "lead_timeline_highlights_public_update" 
ON public.lead_timeline_highlights 
FOR UPDATE 
USING (true);

CREATE POLICY "lead_timeline_highlights_public_delete" 
ON public.lead_timeline_highlights 
FOR DELETE 
USING (true);

-- Create indexes
CREATE INDEX idx_lead_timeline_highlights_lead_id ON public.lead_timeline_highlights(lead_id);
CREATE INDEX idx_lead_timeline_highlights_event_id ON public.lead_timeline_highlights(event_id);
CREATE UNIQUE INDEX idx_lead_timeline_highlights_unique_event ON public.lead_timeline_highlights(lead_id, event_id);