-- Phase 1: AI Quality Analyzer Database Schema

-- Table 1: Store raw Vapi call data
CREATE TABLE public.vapi_calls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vapi_call_id text UNIQUE,
  customer_id uuid REFERENCES public.customer_profiles(id),
  caller_phone text,
  transcript text,
  summary text,
  duration_seconds integer DEFAULT 0,
  ended_reason text,
  assistant_id text,
  call_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table 2: Store call quality analysis
CREATE TABLE public.call_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id uuid REFERENCES public.vapi_calls(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customer_profiles(id),
  analyzed_at timestamp with time zone NOT NULL DEFAULT now(),
  analyzer_model text DEFAULT 'deepseek-chat',
  analysis_cost numeric(10,6) DEFAULT 0,
  overall_score numeric(4,2),
  score_speed integer CHECK (score_speed >= 1 AND score_speed <= 10),
  score_clarity integer CHECK (score_clarity >= 1 AND score_clarity <= 10),
  score_accuracy integer CHECK (score_accuracy >= 1 AND score_accuracy <= 10),
  score_tone integer CHECK (score_tone >= 1 AND score_tone <= 10),
  score_completeness integer CHECK (score_completeness >= 1 AND score_completeness <= 10),
  score_lead_quality integer CHECK (score_lead_quality >= 1 AND score_lead_quality <= 10),
  score_booking_success integer CHECK (score_booking_success >= 1 AND score_booking_success <= 10),
  score_objection_handling integer CHECK (score_objection_handling >= 1 AND score_objection_handling <= 10),
  score_call_duration integer CHECK (score_call_duration >= 1 AND score_call_duration <= 10),
  score_outcome_quality integer CHECK (score_outcome_quality >= 1 AND score_outcome_quality <= 10),
  insights jsonb DEFAULT '{}'::jsonb,
  suggestions jsonb DEFAULT '[]'::jsonb,
  transcript_summary text,
  call_category text,
  sentiment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_vapi_calls_customer_id ON public.vapi_calls(customer_id);
CREATE INDEX idx_vapi_calls_created_at ON public.vapi_calls(created_at DESC);
CREATE INDEX idx_call_analysis_customer_id ON public.call_analysis(customer_id);
CREATE INDEX idx_call_analysis_analyzed_at ON public.call_analysis(analyzed_at DESC);
CREATE INDEX idx_call_analysis_overall_score ON public.call_analysis(overall_score);
CREATE INDEX idx_call_analysis_call_category ON public.call_analysis(call_category);

-- Enable RLS
ALTER TABLE public.vapi_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vapi_calls
CREATE POLICY "vapi_calls_admin_all" ON public.vapi_calls
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "vapi_calls_customer_own" ON public.vapi_calls
  FOR SELECT USING (customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  ));

-- RLS Policies for call_analysis
CREATE POLICY "call_analysis_admin_all" ON public.call_analysis
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "call_analysis_customer_own" ON public.call_analysis
  FOR SELECT USING (customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  ));