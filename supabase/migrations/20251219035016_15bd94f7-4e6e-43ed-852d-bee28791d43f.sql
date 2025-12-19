-- Create training_type enum for type safety
CREATE TYPE training_type AS ENUM ('core', 'advanced', 'bridge_play', 'product', 'process', 'objection', 'generic');

-- Create training_library table - the source of truth for all training content
CREATE TABLE public.training_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  training_type training_type NOT NULL DEFAULT 'core',
  vertical_key TEXT NULL, -- nullable for non-vertical trainings like "Selling Social Media"
  script TEXT NOT NULL,
  why_priority JSONB NOT NULL DEFAULT '[]'::jsonb,
  pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  why_phone_ai_fits JSONB NOT NULL DEFAULT '[]'::jsonb,
  where_to_find JSONB NOT NULL DEFAULT '[]'::jsonb,
  script_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add training_library_id to training_videos for linking
ALTER TABLE public.training_videos 
ADD COLUMN training_library_id UUID NULL REFERENCES public.training_library(id);

-- Create index for efficient lookups
CREATE INDEX idx_training_videos_library_id ON public.training_videos(training_library_id);
CREATE INDEX idx_training_library_vertical_key ON public.training_library(vertical_key);
CREATE INDEX idx_training_library_type ON public.training_library(training_type);
CREATE INDEX idx_training_library_active ON public.training_library(is_active);

-- Enable RLS
ALTER TABLE public.training_library ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can SELECT active entries (for affiliate training display)
CREATE POLICY "training_library_select_active" 
ON public.training_library 
FOR SELECT 
USING (is_active = true);

-- RLS: Admins can do everything
CREATE POLICY "training_library_admin_all" 
ON public.training_library 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_training_library_updated_at
BEFORE UPDATE ON public.training_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: Insert Core Training — Plumbing
INSERT INTO public.training_library (
  title,
  slug,
  training_type,
  vertical_key,
  script,
  why_priority,
  pain_points,
  why_phone_ai_fits,
  where_to_find
) VALUES (
  'Core Training — Plumbing',
  'core-plumbing-v1',
  'core',
  'plumbing',
  'Welcome to the Plumbing Vertical Core Training. In this session, you''ll learn exactly how to position AI phone agents to plumbing business owners...',
  '["High call volume during emergencies", "24/7 availability is critical", "Missed calls = lost revenue", "Seasonal demand spikes"]'::jsonb,
  '["After-hours calls go to voicemail", "Staff overwhelmed during peak times", "Losing jobs to faster competitors", "No consistent follow-up system"]'::jsonb,
  '["Never misses emergency calls", "Books appointments 24/7", "Qualifies leads before dispatching", "Handles routine inquiries instantly"]'::jsonb,
  '["Local plumbing Facebook groups", "Home service trade shows", "Plumbing supply stores", "BNI and networking groups", "Google Maps prospecting"]'::jsonb
);