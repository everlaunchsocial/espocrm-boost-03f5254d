-- Brain notes table for random thoughts/ideas to find later
CREATE TABLE public.brain_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brain_notes ENABLE ROW LEVEL SECURITY;

-- Super admin only access
CREATE POLICY "brain_notes_super_admin_all" ON public.brain_notes
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Trigger for updated_at
CREATE TRIGGER update_brain_notes_updated_at
  BEFORE UPDATE ON public.brain_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();