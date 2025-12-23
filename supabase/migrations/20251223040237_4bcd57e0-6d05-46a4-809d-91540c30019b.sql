-- Create call_recordings table
CREATE TABLE public.call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  caller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  call_direction TEXT NOT NULL DEFAULT 'outbound',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  recording_url TEXT,
  transcription_text TEXT,
  transcription_completed_at TIMESTAMP WITH TIME ZONE,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  call_quality_score INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_call_direction CHECK (call_direction IN ('inbound', 'outbound')),
  CONSTRAINT valid_quality_score CHECK (call_quality_score IS NULL OR (call_quality_score >= 0 AND call_quality_score <= 100))
);

-- Create call_moments table
CREATE TABLE public.call_moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.call_recordings(id) ON DELETE CASCADE,
  moment_type TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL DEFAULT 0,
  transcript_excerpt TEXT NOT NULL,
  ai_commentary TEXT,
  importance_level TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_moment_type CHECK (moment_type IN ('objection', 'buying_signal', 'competitor_mention', 'question', 'commitment', 'concern', 'interest')),
  CONSTRAINT valid_importance CHECK (importance_level IN ('low', 'medium', 'high', 'critical'))
);

-- Create coaching_insights table
CREATE TABLE public.coaching_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.call_recordings(id) ON DELETE CASCADE,
  affiliate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  insight_category TEXT NOT NULL,
  strength_or_weakness TEXT NOT NULL DEFAULT 'opportunity',
  insight_text TEXT NOT NULL,
  specific_example TEXT,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_category CHECK (insight_category IN ('talk_ratio', 'question_quality', 'objection_handling', 'closing_technique', 'discovery', 'rapport', 'listening')),
  CONSTRAINT valid_type CHECK (strength_or_weakness IN ('strength', 'weakness', 'opportunity'))
);

-- Enable RLS
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_recordings
CREATE POLICY "call_recordings_admin_all" ON public.call_recordings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "call_recordings_caller_select" ON public.call_recordings
  FOR SELECT USING (caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "call_recordings_caller_insert" ON public.call_recordings
  FOR INSERT WITH CHECK (caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS policies for call_moments
CREATE POLICY "call_moments_admin_all" ON public.call_moments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "call_moments_via_recording" ON public.call_moments
  FOR SELECT USING (
    recording_id IN (
      SELECT id FROM call_recordings WHERE caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- RLS policies for coaching_insights
CREATE POLICY "coaching_insights_admin_all" ON public.coaching_insights
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "coaching_insights_affiliate_select" ON public.coaching_insights
  FOR SELECT USING (affiliate_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create indexes
CREATE INDEX idx_call_recordings_lead_id ON public.call_recordings(lead_id);
CREATE INDEX idx_call_recordings_caller_id ON public.call_recordings(caller_id);
CREATE INDEX idx_call_recordings_started_at ON public.call_recordings(started_at DESC);
CREATE INDEX idx_call_moments_recording_id ON public.call_moments(recording_id);
CREATE INDEX idx_coaching_insights_recording_id ON public.coaching_insights(recording_id);
CREATE INDEX idx_coaching_insights_affiliate_id ON public.coaching_insights(affiliate_id);