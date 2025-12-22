-- Add AI assistant voice preference columns to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS ai_assistant_voice TEXT DEFAULT 'alloy',
ADD COLUMN IF NOT EXISTS ai_speech_speed NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS ai_auto_play_responses BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_voice_sensitivity TEXT DEFAULT 'medium';

COMMENT ON COLUMN public.user_preferences.ai_assistant_voice IS 'OpenAI voice preference: alloy, echo, fable, onyx, nova, shimmer';
COMMENT ON COLUMN public.user_preferences.ai_speech_speed IS 'Speech speed multiplier: 0.75 to 1.5';
COMMENT ON COLUMN public.user_preferences.ai_voice_sensitivity IS 'Voice activation sensitivity: low, medium, high';