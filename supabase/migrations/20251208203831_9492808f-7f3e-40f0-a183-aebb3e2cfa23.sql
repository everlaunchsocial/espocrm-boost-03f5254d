-- Add fields for manual deploy confirmation on customer_profiles
ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS embed_installed_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS phone_tested_at TIMESTAMPTZ NULL;