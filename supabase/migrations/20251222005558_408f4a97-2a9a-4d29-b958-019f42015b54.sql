-- Create lead_intents table for intent-based tagging
CREATE TABLE public.lead_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('ai', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(lead_id, tag)
);

-- Create indexes
CREATE INDEX idx_lead_intents_lead_id ON public.lead_intents(lead_id);
CREATE INDEX idx_lead_intents_tag ON public.lead_intents(tag);
CREATE INDEX idx_lead_intents_source ON public.lead_intents(source);

-- Enable RLS
ALTER TABLE public.lead_intents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated access on lead_intents"
ON public.lead_intents
FOR ALL
USING (true)
WITH CHECK (true);