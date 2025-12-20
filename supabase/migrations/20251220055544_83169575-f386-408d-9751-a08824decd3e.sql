-- Add settings_updated_at column to customer_profiles for tracking config version
ALTER TABLE public.customer_profiles 
ADD COLUMN IF NOT EXISTS settings_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger function to auto-update settings_updated_at on any column change
CREATE OR REPLACE FUNCTION public.update_customer_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if relevant settings columns changed
  IF (
    OLD.lead_capture_enabled IS DISTINCT FROM NEW.lead_capture_enabled OR
    OLD.after_hours_behavior IS DISTINCT FROM NEW.after_hours_behavior OR
    OLD.business_hours IS DISTINCT FROM NEW.business_hours OR
    OLD.business_type IS DISTINCT FROM NEW.business_type OR
    OLD.business_name IS DISTINCT FROM NEW.business_name OR
    OLD.lead_sources_enabled IS DISTINCT FROM NEW.lead_sources_enabled OR
    OLD.phone IS DISTINCT FROM NEW.phone
  ) THEN
    NEW.settings_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger on customer_profiles
DROP TRIGGER IF EXISTS customer_settings_updated_trigger ON public.customer_profiles;
CREATE TRIGGER customer_settings_updated_trigger
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_settings_timestamp();

-- Also add updated_at to voice_settings if it doesn't exist (for tracking voice config changes)
-- voice_settings already has updated_at, so we just need a trigger for calendar_integrations

-- Create trigger to update calendar_integrations updated_at
CREATE OR REPLACE FUNCTION public.update_calendar_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS calendar_settings_updated_trigger ON public.calendar_integrations;
CREATE TRIGGER calendar_settings_updated_trigger
BEFORE UPDATE ON public.calendar_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_calendar_settings_timestamp();