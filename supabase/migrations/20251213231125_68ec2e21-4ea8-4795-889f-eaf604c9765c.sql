-- ============================================================
-- USAGE & COGS TRACKER - PHASE 1: DATABASE MIGRATIONS
-- ============================================================

-- 1. ALTER vapi_calls table to add cost columns
ALTER TABLE public.vapi_calls 
  ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id),
  ADD COLUMN IF NOT EXISTS demo_id UUID REFERENCES demos(id),
  ADD COLUMN IF NOT EXISTS cost_total DECIMAL(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_llm DECIMAL(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_stt DECIMAL(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_tts DECIMAL(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_transport DECIMAL(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_platform DECIMAL(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Create indexes for vapi_calls
CREATE INDEX IF NOT EXISTS idx_vapi_calls_call_type ON public.vapi_calls(call_type);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_affiliate ON public.vapi_calls(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_created ON public.vapi_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_customer ON public.vapi_calls(customer_id);

-- 2. CREATE service_usage table (provider-agnostic usage tracking)
CREATE TABLE public.service_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'vapi', 'openai', 'lovable_ai', 'twilio', 'telnyx'
  model TEXT, -- 'deepseek-chat', 'gpt-4o-realtime', 'gemini-2.5-flash'
  usage_type TEXT NOT NULL, -- 'phone_call', 'web_chat', 'web_voice', 'preview_chat', 'preview_voice', 'sms'
  call_type TEXT, -- 'customer', 'demo', 'preview'
  customer_id UUID REFERENCES customer_profiles(id),
  affiliate_id UUID REFERENCES affiliates(id),
  demo_id UUID REFERENCES demos(id),
  duration_seconds INTEGER DEFAULT 0,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  cost_breakdown JSONB DEFAULT '{}',
  session_id TEXT,
  reference_id TEXT, -- links to vapi_calls.id, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for service_usage
CREATE INDEX idx_service_usage_provider ON public.service_usage(provider);
CREATE INDEX idx_service_usage_usage_type ON public.service_usage(usage_type);
CREATE INDEX idx_service_usage_call_type ON public.service_usage(call_type);
CREATE INDEX idx_service_usage_customer ON public.service_usage(customer_id);
CREATE INDEX idx_service_usage_affiliate ON public.service_usage(affiliate_id);
CREATE INDEX idx_service_usage_demo ON public.service_usage(demo_id);
CREATE INDEX idx_service_usage_created ON public.service_usage(created_at);
CREATE INDEX idx_service_usage_session ON public.service_usage(session_id);

-- Enable RLS on service_usage
ALTER TABLE public.service_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_usage
CREATE POLICY "service_usage_admin_all" ON public.service_usage
  FOR ALL USING (is_admin());

CREATE POLICY "service_usage_customer_own" ON public.service_usage
  FOR SELECT USING (customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "service_usage_affiliate_own" ON public.service_usage
  FOR SELECT USING (affiliate_id IN (
    SELECT id FROM affiliates WHERE user_id = auth.uid()
  ));

-- 3. CREATE usage_alerts table
CREATE TABLE public.usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'customer_at_80pct', 'customer_at_95pct', 'customer_over_limit', 'affiliate_spam'
  entity_type TEXT NOT NULL, -- 'customer', 'affiliate'
  entity_id UUID NOT NULL,
  threshold_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for usage_alerts
CREATE INDEX idx_usage_alerts_type ON public.usage_alerts(alert_type);
CREATE INDEX idx_usage_alerts_entity ON public.usage_alerts(entity_type, entity_id);
CREATE INDEX idx_usage_alerts_unresolved ON public.usage_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_usage_alerts_created ON public.usage_alerts(created_at);

-- Enable RLS on usage_alerts
ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for usage_alerts
CREATE POLICY "usage_alerts_admin_all" ON public.usage_alerts
  FOR ALL USING (is_admin());

CREATE POLICY "usage_alerts_customer_own" ON public.usage_alerts
  FOR SELECT USING (
    entity_type = 'customer' AND 
    entity_id IN (SELECT id FROM customer_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "usage_alerts_affiliate_own" ON public.usage_alerts
  FOR SELECT USING (
    entity_type = 'affiliate' AND 
    entity_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- 4. Update log_minutes_usage_for_customer to also track cost
CREATE OR REPLACE FUNCTION public.log_minutes_usage_for_customer(
  p_customer_id uuid, 
  p_minutes numeric, 
  p_occurred_at timestamp with time zone,
  p_cost_usd numeric DEFAULT 0
)
RETURNS TABLE(
  new_minutes_used numeric,
  minutes_included integer,
  percent_used numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_cycle_start date;
  v_cycle_end date;
  v_minutes_included int;
  v_new_minutes_used numeric;
BEGIN
  -- 1) Insert raw usage row
  INSERT INTO billing_usage (customer_id, usage_type, amount, timestamp)
  VALUES (p_customer_id, 'voice_minutes', p_minutes, p_occurred_at);

  -- 2) Update minutes_used on customer_profiles
  UPDATE customer_profiles
  SET minutes_used = minutes_used + p_minutes
  WHERE id = p_customer_id
  RETURNING minutes_used INTO v_new_minutes_used;

  -- 3) Get plan info for cycle management
  SELECT customer_plan_id, billing_cycle_start, billing_cycle_end, minutes_included
  INTO v_plan_id, v_cycle_start, v_cycle_end, v_minutes_included
  FROM customer_profiles
  WHERE id = p_customer_id;

  IF v_plan_id IS NULL THEN
    v_minutes_included := 0;
  END IF;

  IF v_cycle_start IS NULL OR v_cycle_end IS NULL THEN
    v_cycle_start := date_trunc('month', p_occurred_at)::date;
    v_cycle_end := (date_trunc('month', p_occurred_at) + interval '1 month' - interval '1 day')::date;

    UPDATE customer_profiles
    SET billing_cycle_start = v_cycle_start,
        billing_cycle_end = v_cycle_end
    WHERE id = p_customer_id;
  END IF;

  RETURN QUERY SELECT 
    v_new_minutes_used,
    COALESCE(v_minutes_included, 0),
    CASE WHEN COALESCE(v_minutes_included, 0) > 0 
         THEN (v_new_minutes_used / v_minutes_included) * 100 
         ELSE 0 
    END;
END;
$$;