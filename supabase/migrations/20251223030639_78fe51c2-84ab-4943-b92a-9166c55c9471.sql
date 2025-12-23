-- Create lead_scores table for AI-powered lead scoring
CREATE TABLE public.lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_score integer NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  engagement_score integer NOT NULL DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  urgency_score integer NOT NULL DEFAULT 0 CHECK (urgency_score >= 0 AND urgency_score <= 100),
  fit_score integer NOT NULL DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
  score_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_calculated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX idx_lead_scores_overall ON public.lead_scores(overall_score DESC);
CREATE INDEX idx_lead_scores_last_calculated ON public.lead_scores(last_calculated);

-- Enable RLS
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything
CREATE POLICY "lead_scores_admin_all" ON public.lead_scores
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS: Affiliates can view scores for leads they own
CREATE POLICY "lead_scores_affiliate_select" ON public.lead_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_scores.lead_id
      AND l.affiliate_id IN (
        SELECT id FROM public.affiliates WHERE user_id = auth.uid()
      )
    )
  );

-- RLS: Authenticated users can view lead scores (for CRM team access)
CREATE POLICY "lead_scores_authenticated_select" ON public.lead_scores
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add lead_scoring_enabled to system_settings if not exists
INSERT INTO public.system_settings (key, value, description)
VALUES ('lead_scoring_enabled', 'true', 'Enable AI-powered lead scoring system')
ON CONFLICT (key) DO NOTHING;