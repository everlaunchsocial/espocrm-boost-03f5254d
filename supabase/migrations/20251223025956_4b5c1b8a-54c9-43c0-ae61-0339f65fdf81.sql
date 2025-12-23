-- Add learned pattern columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS learned_best_days text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS learned_best_times text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS learned_optimal_gap_hours integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS learned_channel_preference text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS learning_confidence integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_pattern_analysis timestamp with time zone DEFAULT NULL;

-- Add constraint for learning_confidence (0-100)
ALTER TABLE public.leads 
ADD CONSTRAINT learning_confidence_range CHECK (learning_confidence IS NULL OR (learning_confidence >= 0 AND learning_confidence <= 100));

-- Add constraint for learned_channel_preference
ALTER TABLE public.leads 
ADD CONSTRAINT learned_channel_preference_valid CHECK (learned_channel_preference IS NULL OR learned_channel_preference IN ('email', 'sms', 'phone', 'mixed'));

-- Create index for pattern analysis queries
CREATE INDEX IF NOT EXISTS idx_leads_last_pattern_analysis ON public.leads(last_pattern_analysis) WHERE last_pattern_analysis IS NOT NULL;

-- Add ml_learning_enabled setting if not exists
INSERT INTO public.system_settings (key, value, description)
VALUES ('ml_learning_enabled', 'true', 'Enable ML-based learning for follow-up pattern analysis')
ON CONFLICT (key) DO NOTHING;