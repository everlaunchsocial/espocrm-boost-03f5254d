-- ===========================================
-- BubbleBolt Closed-Loop Improvement System
-- ===========================================

-- 1. Add metadata columns to call_analysis for actionability
ALTER TABLE public.call_analysis 
ADD COLUMN IF NOT EXISTS vertical_id text,
ADD COLUMN IF NOT EXISTS channel text DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS config_version text,
ADD COLUMN IF NOT EXISTS action_summary jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS issue_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mapped_layer text,
ADD COLUMN IF NOT EXISTS recommended_fix jsonb;

-- Add constraint for mapped_layer
ALTER TABLE public.call_analysis 
ADD CONSTRAINT call_analysis_mapped_layer_check 
CHECK (mapped_layer IS NULL OR mapped_layer IN ('brain_rules', 'workflow', 'config_toggle', 'business_facts'));

-- Add constraint for channel
ALTER TABLE public.call_analysis 
ADD CONSTRAINT call_analysis_channel_check 
CHECK (channel IS NULL OR channel IN ('phone', 'web_chat', 'web_voice', 'sms'));

-- Index for pattern detection queries
CREATE INDEX IF NOT EXISTS idx_call_analysis_vertical_channel 
ON public.call_analysis(vertical_id, channel);

CREATE INDEX IF NOT EXISTS idx_call_analysis_issue_tags 
ON public.call_analysis USING GIN(issue_tags);

CREATE INDEX IF NOT EXISTS idx_call_analysis_analyzed_at_score 
ON public.call_analysis(analyzed_at DESC, overall_score);

-- 2. Create alerts table for low score notifications
CREATE TABLE IF NOT EXISTS public.quality_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  alert_type text NOT NULL DEFAULT 'low_score',
  severity text NOT NULL DEFAULT 'warning',
  customer_id uuid REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  call_analysis_id uuid REFERENCES public.call_analysis(id) ON DELETE CASCADE,
  vertical_id text,
  channel text,
  threshold_value numeric,
  actual_value numeric,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  CONSTRAINT quality_alerts_severity_check CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT quality_alerts_type_check CHECK (alert_type IN ('low_score', 'pattern_detected', 'threshold_breach', 'compliance_risk'))
);

-- Enable RLS on quality_alerts
ALTER TABLE public.quality_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only access to quality_alerts
CREATE POLICY "quality_alerts_admin_all" ON public.quality_alerts
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Index for querying alerts
CREATE INDEX IF NOT EXISTS idx_quality_alerts_unresolved 
ON public.quality_alerts(created_at DESC) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quality_alerts_customer 
ON public.quality_alerts(customer_id, created_at DESC);

-- 3. Create remediation_suggestions table (never auto-apply)
CREATE TABLE IF NOT EXISTS public.remediation_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  vertical_id text NOT NULL,
  channel text,
  issue_tags text[] NOT NULL DEFAULT '{}',
  occurrence_count integer NOT NULL DEFAULT 1,
  suggested_changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  applied_at timestamp with time zone,
  notes text,
  source_analyses uuid[] DEFAULT '{}',
  
  CONSTRAINT remediation_suggestions_status_check CHECK (status IN ('draft', 'approved', 'rejected', 'applied'))
);

-- Enable RLS on remediation_suggestions
ALTER TABLE public.remediation_suggestions ENABLE ROW LEVEL SECURITY;

-- Admin-only access to remediation_suggestions
CREATE POLICY "remediation_suggestions_admin_all" ON public.remediation_suggestions
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Index for finding suggestions by vertical/status
CREATE INDEX IF NOT EXISTS idx_remediation_suggestions_vertical_status 
ON public.remediation_suggestions(vertical_id, status);

CREATE INDEX IF NOT EXISTS idx_remediation_suggestions_issue_tags 
ON public.remediation_suggestions USING GIN(issue_tags);

-- 4. Create materialized view for weekly pattern aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS public.quality_patterns_weekly AS
WITH weekly_stats AS (
  SELECT 
    vertical_id,
    channel,
    date_trunc('week', analyzed_at) AS week_start,
    COUNT(*) AS call_count,
    AVG(overall_score) AS avg_score,
    AVG(score_clarity) AS avg_clarity,
    AVG(score_accuracy) AS avg_accuracy,
    AVG(score_tone) AS avg_tone,
    AVG(score_completeness) AS avg_completeness,
    AVG(score_lead_quality) AS avg_lead_quality,
    AVG(score_booking_success) AS avg_booking_success,
    AVG(score_objection_handling) AS avg_objection_handling,
    COUNT(*) FILTER (WHERE overall_score < 6) AS low_score_count,
    COUNT(*) FILTER (WHERE sentiment = 'negative') AS negative_sentiment_count
  FROM public.call_analysis
  WHERE analyzed_at >= NOW() - INTERVAL '90 days'
  GROUP BY vertical_id, channel, date_trunc('week', analyzed_at)
)
SELECT 
  ws.*,
  LAG(ws.avg_score) OVER (PARTITION BY ws.vertical_id, ws.channel ORDER BY ws.week_start) AS prev_week_score,
  ws.avg_score - LAG(ws.avg_score) OVER (PARTITION BY ws.vertical_id, ws.channel ORDER BY ws.week_start) AS score_trend
FROM weekly_stats ws
ORDER BY ws.week_start DESC, ws.vertical_id;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_quality_patterns_weekly_lookup 
ON public.quality_patterns_weekly(vertical_id, channel, week_start DESC);

-- 5. Create function to aggregate issue tags by vertical/channel
CREATE OR REPLACE FUNCTION public.get_top_issue_tags(
  p_vertical_id text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_days integer DEFAULT 7,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  issue_tag text,
  occurrence_count bigint,
  affected_verticals text[],
  avg_score_impact numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(ca.issue_tags) AS issue_tag,
    COUNT(*) AS occurrence_count,
    ARRAY_AGG(DISTINCT ca.vertical_id) FILTER (WHERE ca.vertical_id IS NOT NULL) AS affected_verticals,
    AVG(ca.overall_score) AS avg_score_impact
  FROM public.call_analysis ca
  WHERE ca.analyzed_at >= NOW() - (p_days || ' days')::interval
    AND (p_vertical_id IS NULL OR ca.vertical_id = p_vertical_id)
    AND (p_channel IS NULL OR ca.channel = p_channel)
    AND ca.issue_tags IS NOT NULL 
    AND array_length(ca.issue_tags, 1) > 0
  GROUP BY unnest(ca.issue_tags)
  ORDER BY occurrence_count DESC
  LIMIT p_limit;
END;
$$;

-- 6. Create function to get struggling verticals
CREATE OR REPLACE FUNCTION public.get_struggling_verticals(
  p_days integer DEFAULT 7,
  p_limit integer DEFAULT 5,
  p_min_calls integer DEFAULT 3
)
RETURNS TABLE(
  vertical_id text,
  channel text,
  call_count bigint,
  avg_score numeric,
  low_score_count bigint,
  top_issues text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.vertical_id,
    ca.channel,
    COUNT(*) AS call_count,
    AVG(ca.overall_score) AS avg_score,
    COUNT(*) FILTER (WHERE ca.overall_score < 6) AS low_score_count,
    (
      SELECT ARRAY_AGG(tag ORDER BY cnt DESC)
      FROM (
        SELECT unnest(ca2.issue_tags) AS tag, COUNT(*) AS cnt
        FROM public.call_analysis ca2
        WHERE ca2.vertical_id = ca.vertical_id 
          AND ca2.channel = ca.channel
          AND ca2.analyzed_at >= NOW() - (p_days || ' days')::interval
        GROUP BY unnest(ca2.issue_tags)
        ORDER BY cnt DESC
        LIMIT 3
      ) sub
    ) AS top_issues
  FROM public.call_analysis ca
  WHERE ca.analyzed_at >= NOW() - (p_days || ' days')::interval
    AND ca.vertical_id IS NOT NULL
  GROUP BY ca.vertical_id, ca.channel
  HAVING COUNT(*) >= p_min_calls
  ORDER BY AVG(ca.overall_score) ASC
  LIMIT p_limit;
END;
$$;

-- 7. Create trigger to auto-update remediation_suggestions updated_at
CREATE OR REPLACE FUNCTION public.update_remediation_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_remediation_suggestions_updated_at ON public.remediation_suggestions;
CREATE TRIGGER update_remediation_suggestions_updated_at
  BEFORE UPDATE ON public.remediation_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_remediation_suggestions_updated_at();