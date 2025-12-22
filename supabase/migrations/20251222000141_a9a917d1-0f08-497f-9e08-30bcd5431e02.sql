-- Create lead_presence table for tracking active leads
CREATE TABLE public.lead_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Enable RLS
ALTER TABLE public.lead_presence ENABLE ROW LEVEL SECURITY;

-- Allow public read (demo pages need to update this)
CREATE POLICY "lead_presence_public_read" 
ON public.lead_presence 
FOR SELECT 
USING (true);

-- Allow public upsert (demo viewers will ping this)
CREATE POLICY "lead_presence_public_upsert" 
ON public.lead_presence 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "lead_presence_public_update" 
ON public.lead_presence 
FOR UPDATE 
USING (true);

-- Index for quick lookups
CREATE INDEX idx_lead_presence_lead_id ON public.lead_presence(lead_id);
CREATE INDEX idx_lead_presence_last_seen ON public.lead_presence(last_seen_at DESC);

-- Enable realtime for presence updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_presence;