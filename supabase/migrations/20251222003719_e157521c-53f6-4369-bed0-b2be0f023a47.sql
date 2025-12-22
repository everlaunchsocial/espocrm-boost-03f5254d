-- Add ai_outcome column to call_logs table
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ai_outcome text,
ADD COLUMN IF NOT EXISTS ai_outcome_confidence numeric,
ADD COLUMN IF NOT EXISTS ai_outcome_reason text;

-- Create index for filtering by outcome
CREATE INDEX IF NOT EXISTS idx_call_logs_ai_outcome ON public.call_logs(ai_outcome);

-- Add comment for documentation
COMMENT ON COLUMN public.call_logs.ai_outcome IS 'AI-classified call outcome: connected, no_answer, voicemail_left, callback_requested, answering_machine, inconclusive';