-- Create new single-row JSONB cache table
CREATE TABLE IF NOT EXISTS public.heygen_cache (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow service role access
ALTER TABLE public.heygen_cache ENABLE ROW LEVEL SECURITY;

-- Admin read access policy
CREATE POLICY "Admin users can read cache" 
  ON public.heygen_cache
  FOR SELECT
  USING (public.is_admin());

-- Drop old multi-row cache table
DROP TABLE IF EXISTS public.heygen_avatars_cache;