-- Create lead_team_notes table
CREATE TABLE public.lead_team_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_lead_team_notes_lead_id ON public.lead_team_notes(lead_id);
CREATE INDEX idx_lead_team_notes_created_at ON public.lead_team_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.lead_team_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read/write
CREATE POLICY "lead_team_notes_select_authenticated" ON public.lead_team_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "lead_team_notes_insert_authenticated" ON public.lead_team_notes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "lead_team_notes_delete_own" ON public.lead_team_notes
  FOR DELETE USING (created_by = auth.uid());