-- Add affiliate_id to contacts table for attribution tracking
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- Create index for efficient affiliate contact lookups
CREATE INDEX IF NOT EXISTS idx_contacts_affiliate_id ON public.contacts(affiliate_id);

-- Add affiliate_id to demos table (rep_id already exists, but we need affiliate_id for the affiliate record)
ALTER TABLE public.demos 
ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- Create index for efficient affiliate demo lookups
CREATE INDEX IF NOT EXISTS idx_demos_affiliate_id ON public.demos(affiliate_id);
