-- Create the followup_learning_log table for tracking suggestion acceptance and completion
CREATE TABLE public.followup_learning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  suggestion_text text NOT NULL,
  suggestion_type text NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  confirmed boolean NOT NULL DEFAULT false,
  confidence_score numeric(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  demo_id uuid REFERENCES public.demos(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.followup_learning_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own logs
CREATE POLICY "Users can insert own logs"
ON public.followup_learning_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can view their own logs
CREATE POLICY "Users can view own logs"
ON public.followup_learning_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can update their own logs (for setting confirmed = true)
CREATE POLICY "Users can update own logs"
ON public.followup_learning_log
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Admins can view all logs for analytics
CREATE POLICY "Admins can view all logs"
ON public.followup_learning_log
FOR SELECT
TO authenticated
USING (is_admin());

-- Create index for efficient lookups
CREATE INDEX idx_followup_learning_user_recorded 
ON public.followup_learning_log(user_id, recorded_at DESC);

CREATE INDEX idx_followup_learning_type 
ON public.followup_learning_log(suggestion_type);