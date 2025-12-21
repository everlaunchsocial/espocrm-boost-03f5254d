-- Create user_preferences table for storing user-specific settings
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enable_voice_summary BOOLEAN NOT NULL DEFAULT true,
  summary_delivery_time TIME NOT NULL DEFAULT '09:00:00',
  include_followup_reminders BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences"
ON public.user_preferences
FOR SELECT
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();