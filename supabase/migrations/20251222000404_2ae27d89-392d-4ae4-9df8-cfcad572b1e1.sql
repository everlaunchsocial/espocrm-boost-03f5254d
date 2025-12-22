-- Create lead_views table for tracking profile views
CREATE TABLE public.lead_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_lead_views_lead_id ON public.lead_views(lead_id);
CREATE INDEX idx_lead_views_viewed_at ON public.lead_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.lead_views ENABLE ROW LEVEL SECURITY;

-- RLS policies: only authenticated team members can insert/read
CREATE POLICY "lead_views_insert_authenticated" ON public.lead_views
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "lead_views_select_authenticated" ON public.lead_views
  FOR SELECT USING (auth.uid() IS NOT NULL);