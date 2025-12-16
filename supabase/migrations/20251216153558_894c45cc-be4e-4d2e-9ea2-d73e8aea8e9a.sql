-- Add heygen_voice_id column to store HeyGen's native voice clone ID
ALTER TABLE public.affiliate_avatar_profiles 
ADD COLUMN IF NOT EXISTS heygen_voice_id TEXT;