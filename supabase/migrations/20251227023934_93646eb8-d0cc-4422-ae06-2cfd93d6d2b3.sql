-- Add missing columns to customer_profiles for account settings
ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.customer_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  -- Email notifications
  email_new_leads boolean DEFAULT true,
  email_missed_calls boolean DEFAULT true,
  email_voicemail_transcripts boolean DEFAULT true,
  email_weekly_summary boolean DEFAULT true,
  email_billing boolean DEFAULT true,
  -- SMS notifications
  sms_urgent_missed_calls boolean DEFAULT false,
  sms_new_leads_realtime boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- Enable RLS
ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Customers can only manage their own notification preferences
CREATE POLICY "Customers can view their own notification preferences"
ON public.customer_notification_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_profiles cp
    WHERE cp.id = customer_notification_preferences.customer_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can insert their own notification preferences"
ON public.customer_notification_preferences
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_profiles cp
    WHERE cp.id = customer_notification_preferences.customer_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can update their own notification preferences"
ON public.customer_notification_preferences
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.customer_profiles cp
    WHERE cp.id = customer_notification_preferences.customer_id
    AND cp.user_id = auth.uid()
  )
);

-- Admins can manage all notification preferences
CREATE POLICY "Admins can manage all notification preferences"
ON public.customer_notification_preferences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.global_role IN ('super_admin', 'admin')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_customer_notification_preferences_updated_at
BEFORE UPDATE ON public.customer_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();