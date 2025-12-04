-- Expand leads table for home improvement data import
-- Add address fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Add business/industry fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS service_category TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'home-improvement';

-- Add social media fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Add metrics fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_review_count INTEGER;

-- Add flags and notes
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS has_website BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add batch tracking for import rollback capability
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Make email nullable (many imported leads won't have emails)
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;

-- Create index on import_batch_id for fast rollback queries
CREATE INDEX IF NOT EXISTS idx_leads_import_batch_id ON public.leads(import_batch_id);