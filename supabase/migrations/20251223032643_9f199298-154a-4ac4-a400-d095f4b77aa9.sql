-- Create pipeline_forecasts table
CREATE TABLE public.pipeline_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id),
  forecast_date DATE NOT NULL,
  forecast_period TEXT NOT NULL CHECK (forecast_period IN ('week', 'month', 'quarter')),
  predicted_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  confidence_interval_low DECIMAL(12, 2) NOT NULL DEFAULT 0,
  confidence_interval_high DECIMAL(12, 2) NOT NULL DEFAULT 0,
  predicted_closes INTEGER NOT NULL DEFAULT 0,
  predicted_close_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
  factors JSONB DEFAULT '{}'::jsonb,
  actual_revenue DECIMAL(12, 2),
  actual_closes INTEGER,
  accuracy_score DECIMAL(5, 4),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_predictions table
CREATE TABLE public.lead_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  predicted_close_probability DECIMAL(5, 4) NOT NULL DEFAULT 0 CHECK (predicted_close_probability >= 0 AND predicted_close_probability <= 1),
  predicted_close_date DATE,
  predicted_deal_value DECIMAL(12, 2),
  predicted_time_to_close_days INTEGER,
  prediction_factors JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Add indexes
CREATE INDEX idx_pipeline_forecasts_affiliate ON public.pipeline_forecasts(affiliate_id);
CREATE INDEX idx_pipeline_forecasts_date ON public.pipeline_forecasts(forecast_date);
CREATE INDEX idx_pipeline_forecasts_period ON public.pipeline_forecasts(forecast_period);
CREATE INDEX idx_lead_predictions_lead ON public.lead_predictions(lead_id);
CREATE INDEX idx_lead_predictions_probability ON public.lead_predictions(predicted_close_probability DESC);
CREATE INDEX idx_lead_predictions_close_date ON public.lead_predictions(predicted_close_date);

-- Enable RLS
ALTER TABLE public.pipeline_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_predictions ENABLE ROW LEVEL SECURITY;

-- Pipeline forecasts policies
CREATE POLICY "pipeline_forecasts_admin_all" ON public.pipeline_forecasts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "pipeline_forecasts_affiliate_select" ON public.pipeline_forecasts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Lead predictions policies - anyone authenticated can view
CREATE POLICY "lead_predictions_authenticated_select" ON public.lead_predictions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "lead_predictions_admin_all" ON public.lead_predictions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());