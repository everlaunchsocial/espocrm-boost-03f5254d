-- Create table for follow-up suggestion feedback
CREATE TABLE public.follow_up_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  suggestion_key TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  feedback TEXT NOT NULL CHECK (feedback IN ('helpful', 'not_helpful')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_follow_up_feedback_lead_id ON public.follow_up_feedback(lead_id);
CREATE INDEX idx_follow_up_feedback_suggestion_key ON public.follow_up_feedback(suggestion_key);
CREATE UNIQUE INDEX idx_follow_up_feedback_unique ON public.follow_up_feedback(suggestion_key, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Enable RLS
ALTER TABLE public.follow_up_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public access
CREATE POLICY "Allow public access on follow_up_feedback" 
  ON public.follow_up_feedback 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);