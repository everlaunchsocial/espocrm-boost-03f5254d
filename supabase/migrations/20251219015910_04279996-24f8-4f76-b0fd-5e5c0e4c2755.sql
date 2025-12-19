-- Create training_videos table for admin-generated training content
CREATE TABLE public.training_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  script_text TEXT NOT NULL,
  avatar_id TEXT NOT NULL,
  avatar_name TEXT,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  vertical TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  heygen_video_id TEXT,
  video_url TEXT,
  error_message TEXT,
  estimated_cost_usd NUMERIC(10, 4),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

-- Only super admins and admins can manage training videos
CREATE POLICY "Admins can manage training videos"
ON public.training_videos
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_training_videos_updated_at
BEFORE UPDATE ON public.training_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_training_videos_status ON public.training_videos(status);
CREATE INDEX idx_training_videos_vertical ON public.training_videos(vertical);