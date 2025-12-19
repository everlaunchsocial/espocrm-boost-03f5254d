-- Create cache table for HeyGen avatars
CREATE TABLE public.heygen_avatars_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gender TEXT,
  preview_image_url TEXT,
  preview_video_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  tags TEXT[],
  default_voice_id TEXT,
  default_voice_name TEXT,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_heygen_avatars_cache_avatar_id ON public.heygen_avatars_cache(avatar_id);
CREATE INDEX idx_heygen_avatars_cache_cached_at ON public.heygen_avatars_cache(cached_at);

-- Allow public read access (no auth needed for avatar list)
ALTER TABLE public.heygen_avatars_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached avatars"
ON public.heygen_avatars_cache
FOR SELECT
USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage cache"
ON public.heygen_avatars_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');