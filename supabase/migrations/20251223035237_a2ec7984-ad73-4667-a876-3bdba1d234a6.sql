-- Create sentiment_analysis table
CREATE TABLE public.sentiment_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('email_received', 'call_notes', 'sms_received', 'demo_feedback', 'notes')),
  content_analyzed TEXT NOT NULL,
  sentiment_score DECIMAL NOT NULL CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
  sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
  emotions_detected JSONB NOT NULL DEFAULT '{}',
  urgency_level TEXT NOT NULL DEFAULT 'low' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  key_phrases TEXT[] DEFAULT '{}',
  recommended_action TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emotional_journey table
CREATE TABLE public.emotional_journey (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE UNIQUE,
  journey_data JSONB NOT NULL DEFAULT '[]',
  current_emotional_state TEXT NOT NULL DEFAULT 'neutral',
  trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'declining', 'stable')),
  risk_level TEXT NOT NULL DEFAULT 'none' CHECK (risk_level IN ('none', 'low', 'medium', 'high')),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotional_journey ENABLE ROW LEVEL SECURITY;

-- RLS policies for sentiment_analysis
CREATE POLICY "sentiment_analysis_admin_all" ON public.sentiment_analysis
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "sentiment_analysis_authenticated_select" ON public.sentiment_analysis
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sentiment_analysis_authenticated_insert" ON public.sentiment_analysis
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for emotional_journey
CREATE POLICY "emotional_journey_admin_all" ON public.emotional_journey
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "emotional_journey_authenticated_select" ON public.emotional_journey
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "emotional_journey_authenticated_manage" ON public.emotional_journey
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_sentiment_analysis_lead ON public.sentiment_analysis(lead_id);
CREATE INDEX idx_sentiment_analysis_score ON public.sentiment_analysis(sentiment_score);
CREATE INDEX idx_sentiment_analysis_analyzed_at ON public.sentiment_analysis(analyzed_at);
CREATE INDEX idx_emotional_journey_lead ON public.emotional_journey(lead_id);
CREATE INDEX idx_emotional_journey_risk ON public.emotional_journey(risk_level);