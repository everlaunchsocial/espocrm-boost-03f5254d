-- Add latest_video_path column to training_library
-- This stores the storage path (not URL) of the most recent completed video
ALTER TABLE public.training_library 
ADD COLUMN latest_video_path TEXT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.training_library.latest_video_path IS 'Storage path in training-videos bucket for the latest completed video';