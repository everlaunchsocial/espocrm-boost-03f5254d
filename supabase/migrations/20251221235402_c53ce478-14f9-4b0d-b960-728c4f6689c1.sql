-- Create suggestion_log table for capturing AI feature suggestions
CREATE TABLE public.suggestion_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_text TEXT NOT NULL,
  context TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suggestion_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access (super_admin can read/write)
CREATE POLICY "suggestion_log_super_admin_all" 
ON public.suggestion_log 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create index for quick retrieval by date
CREATE INDEX idx_suggestion_log_created_at ON public.suggestion_log(created_at DESC);