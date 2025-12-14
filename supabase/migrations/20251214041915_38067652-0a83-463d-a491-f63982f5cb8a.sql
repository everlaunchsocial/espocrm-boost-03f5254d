-- Phase A: Master Testing Hotline Database Setup

-- 1. Create system_settings table for storing master testing phone number
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage settings
CREATE POLICY "system_settings_admin_all" ON public.system_settings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Authenticated users can read settings
CREATE POLICY "system_settings_read_authenticated" ON public.system_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Add testing_code column to customer_profiles
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS testing_code text;

-- Add unique constraint on testing_code
ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_testing_code_unique UNIQUE (testing_code);

-- 3. Populate testing_code for all existing customers with 4-digit random codes
UPDATE public.customer_profiles
SET testing_code = LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0')
WHERE testing_code IS NULL;

-- 4. Add via_testing_line column to vapi_calls if not exists
ALTER TABLE public.vapi_calls
  ADD COLUMN IF NOT EXISTS via_testing_line boolean DEFAULT false;

-- 5. Create trigger to auto-populate testing_code on new customer inserts
CREATE OR REPLACE FUNCTION public.generate_testing_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  -- Only generate if testing_code is null
  IF NEW.testing_code IS NULL THEN
    LOOP
      -- Generate 4-digit code
      new_code := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
      
      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM customer_profiles WHERE testing_code = new_code) INTO code_exists;
      
      -- Exit loop if unique
      IF NOT code_exists THEN
        NEW.testing_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS customer_profiles_generate_testing_code ON public.customer_profiles;
CREATE TRIGGER customer_profiles_generate_testing_code
  BEFORE INSERT ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_testing_code();