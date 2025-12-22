-- Create lead_tags table
CREATE TABLE public.lead_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_text TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_lead_tags_lead_id ON public.lead_tags(lead_id);
CREATE UNIQUE INDEX idx_lead_tags_unique ON public.lead_tags(lead_id, tag_text);

-- Enable RLS
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can CRUD
CREATE POLICY "lead_tags_select_authenticated" ON public.lead_tags
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "lead_tags_insert_authenticated" ON public.lead_tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "lead_tags_delete_authenticated" ON public.lead_tags
  FOR DELETE USING (auth.uid() IS NOT NULL);