-- Extend customer_profiles with lead routing fields
ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS additional_notification_emails text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS additional_notification_phones text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{"monday":{"enabled":true,"open":"09:00","close":"17:00"},"tuesday":{"enabled":true,"open":"09:00","close":"17:00"},"wednesday":{"enabled":true,"open":"09:00","close":"17:00"},"thursday":{"enabled":true,"open":"09:00","close":"17:00"},"friday":{"enabled":true,"open":"09:00","close":"17:00"},"saturday":{"enabled":false,"open":"09:00","close":"17:00"},"sunday":{"enabled":false,"open":"09:00","close":"17:00"}}',
ADD COLUMN IF NOT EXISTS customer_timezone text DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS after_hours_behavior text DEFAULT 'notify',
ADD COLUMN IF NOT EXISTS lead_sources_enabled jsonb DEFAULT '{"voice":true,"chat":true,"form":true,"callback":true}';