-- Add voice_speed column for Cartesia speed control
ALTER TABLE public.voice_settings 
ADD COLUMN IF NOT EXISTS voice_speed numeric DEFAULT 1.0;

-- Add comment explaining the column
COMMENT ON COLUMN public.voice_settings.voice_speed IS 'Voice playback speed for Cartesia (0.5 to 2.0, default 1.0)';