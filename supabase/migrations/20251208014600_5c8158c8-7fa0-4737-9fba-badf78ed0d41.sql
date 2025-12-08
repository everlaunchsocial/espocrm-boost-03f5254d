-- 1) Create customer_plans table
CREATE TABLE IF NOT EXISTS customer_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  setup_fee numeric NOT NULL,
  monthly_price numeric NOT NULL,
  minutes_included int NOT NULL,
  overage_rate numeric NOT NULL,
  stripe_price_id text,
  stripe_setup_price_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_plans ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read active plans, admins can manage all
CREATE POLICY "customer_plans_read_active" ON customer_plans
FOR SELECT USING (is_active = true);

CREATE POLICY "customer_plans_admin_all" ON customer_plans
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 2) Seed the three plans
INSERT INTO customer_plans (name, code, setup_fee, monthly_price, minutes_included, overage_rate)
SELECT 'Starter', 'starter', 499, 149, 300, 0.10
WHERE NOT EXISTS (SELECT 1 FROM customer_plans WHERE code = 'starter');

INSERT INTO customer_plans (name, code, setup_fee, monthly_price, minutes_included, overage_rate)
SELECT 'Growth', 'growth', 799, 249, 750, 0.09
WHERE NOT EXISTS (SELECT 1 FROM customer_plans WHERE code = 'growth');

INSERT INTO customer_plans (name, code, setup_fee, monthly_price, minutes_included, overage_rate)
SELECT 'Professional', 'professional', 999, 399, 1500, 0.08
WHERE NOT EXISTS (SELECT 1 FROM customer_plans WHERE code = 'professional');

-- 3) Extend customer_profiles with plan linkage and billing cycle
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS customer_plan_id uuid REFERENCES customer_plans(id),
ADD COLUMN IF NOT EXISTS billing_cycle_start date,
ADD COLUMN IF NOT EXISTS billing_cycle_end date;

-- 4) Create function to log minutes usage
CREATE OR REPLACE FUNCTION public.log_minutes_usage_for_customer(
  p_customer_id uuid,
  p_minutes numeric,
  p_occurred_at timestamp with time zone
)
RETURNS void AS $$
DECLARE
  v_plan_id uuid;
  v_cycle_start date;
  v_cycle_end date;
BEGIN
  -- 1) Insert raw usage row
  INSERT INTO billing_usage (customer_id, usage_type, amount, timestamp)
  VALUES (p_customer_id, 'voice_minutes', p_minutes, p_occurred_at);

  -- 2) Ensure customer_profiles has a cycle + plan
  SELECT customer_plan_id, billing_cycle_start, billing_cycle_end
  INTO v_plan_id, v_cycle_start, v_cycle_end
  FROM customer_profiles
  WHERE id = p_customer_id;

  IF v_plan_id IS NULL THEN
    -- No plan assigned: nothing further
    RETURN;
  END IF;

  IF v_cycle_start IS NULL OR v_cycle_end IS NULL THEN
    -- Initialize cycle as "month of occurred_at"
    v_cycle_start := date_trunc('month', p_occurred_at)::date;
    v_cycle_end := (date_trunc('month', p_occurred_at) + interval '1 month' - interval '1 day')::date;

    UPDATE customer_profiles
    SET billing_cycle_start = v_cycle_start,
        billing_cycle_end = v_cycle_end
    WHERE id = p_customer_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) Create customer_minutes_summary view
CREATE OR REPLACE VIEW customer_minutes_summary AS
SELECT
  cp.id AS customer_id,
  cp.user_id,
  cp.customer_plan_id,
  cp.billing_cycle_start,
  cp.billing_cycle_end,
  cp.affiliate_id,
  COALESCE(SUM(
    CASE
      WHEN bu.usage_type = 'voice_minutes'
           AND bu.timestamp::date >= cp.billing_cycle_start
           AND bu.timestamp::date <= cp.billing_cycle_end
      THEN bu.amount
      ELSE 0
    END
  ), 0) AS total_minutes_used,
  cplan.minutes_included,
  cplan.overage_rate,
  cplan.name AS plan_name
FROM customer_profiles cp
LEFT JOIN billing_usage bu ON bu.customer_id = cp.id
LEFT JOIN customer_plans cplan ON cplan.id = cp.customer_plan_id
GROUP BY
  cp.id,
  cp.user_id,
  cp.customer_plan_id,
  cp.billing_cycle_start,
  cp.billing_cycle_end,
  cp.affiliate_id,
  cplan.minutes_included,
  cplan.overage_rate,
  cplan.name;

-- 6) Create admin test helper to simulate minutes usage
CREATE OR REPLACE FUNCTION public.test_add_minutes_for_customer(
  p_customer_id uuid,
  p_minutes numeric
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND global_role IN ('super_admin', 'admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false, 'Access denied: admin role required'::text;
    RETURN;
  END IF;

  -- Verify customer exists
  IF NOT EXISTS (SELECT 1 FROM customer_profiles WHERE id = p_customer_id) THEN
    RETURN QUERY SELECT false, ('Customer not found: ' || p_customer_id)::text;
    RETURN;
  END IF;

  -- Log the minutes
  PERFORM log_minutes_usage_for_customer(p_customer_id, p_minutes, now());

  RETURN QUERY SELECT true, ('Added ' || p_minutes || ' minutes for customer ' || p_customer_id)::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;