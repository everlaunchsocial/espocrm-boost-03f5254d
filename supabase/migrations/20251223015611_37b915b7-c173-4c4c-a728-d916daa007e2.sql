-- Add Google Places enrichment columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS google_place_id text,
ADD COLUMN IF NOT EXISTS google_enriched_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS google_business_status text,
ADD COLUMN IF NOT EXISTS google_formatted_address text,
ADD COLUMN IF NOT EXISTS google_formatted_phone text,
ADD COLUMN IF NOT EXISTS google_types text[],
ADD COLUMN IF NOT EXISTS google_opening_hours jsonb,
ADD COLUMN IF NOT EXISTS google_price_level integer,
ADD COLUMN IF NOT EXISTS google_user_ratings_total integer,
ADD COLUMN IF NOT EXISTS google_photos_count integer;