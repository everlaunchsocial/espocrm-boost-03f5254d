-- Add needs_fixing and fix_description columns to test_step_completions
ALTER TABLE public.test_step_completions 
ADD COLUMN IF NOT EXISTS needs_fixing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fix_description text;