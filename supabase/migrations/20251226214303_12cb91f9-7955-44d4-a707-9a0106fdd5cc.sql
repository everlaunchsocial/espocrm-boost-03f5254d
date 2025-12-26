-- Add source column to demos table for lead source tracking
ALTER TABLE public.demos 
ADD COLUMN source text NOT NULL DEFAULT 'affiliate_manual';

-- Add comment for documentation
COMMENT ON COLUMN public.demos.source IS 'Source of the demo: web_form (from /demo-request), affiliate_manual (created by affiliate), landing_page (from affiliate landing page)';