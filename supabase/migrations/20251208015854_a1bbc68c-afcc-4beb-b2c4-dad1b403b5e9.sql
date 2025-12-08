-- Create function to calculate customer cycle charges
CREATE OR REPLACE FUNCTION public.calculate_customer_cycle_charges(
  p_customer_id uuid
)
RETURNS TABLE (
  customer_id uuid,
  customer_plan_id uuid,
  plan_code text,
  plan_name text,
  monthly_price numeric,
  minutes_included int,
  overage_rate numeric,
  billing_cycle_start date,
  billing_cycle_end date,
  total_minutes_used numeric,
  overage_minutes numeric,
  overage_cost numeric,
  base_cost numeric,
  total_estimated_cost numeric
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_plan_code text;
  v_plan_name text;
  v_monthly_price numeric;
  v_minutes_included int;
  v_overage_rate numeric;
  v_cycle_start date;
  v_cycle_end date;
  v_total_minutes numeric;
  v_overage_minutes numeric;
  v_overage_cost numeric;
  v_base_cost numeric;
BEGIN
  -- 1) Get customer profile and plan
  SELECT
    cp.customer_plan_id,
    cp.billing_cycle_start,
    cp.billing_cycle_end
  INTO
    v_plan_id,
    v_cycle_start,
    v_cycle_end
  FROM customer_profiles cp
  WHERE cp.id = p_customer_id;

  IF v_plan_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    cpl.id,
    cpl.code,
    cpl.name,
    cpl.monthly_price,
    cpl.minutes_included,
    cpl.overage_rate
  INTO
    v_plan_id,
    v_plan_code,
    v_plan_name,
    v_monthly_price,
    v_minutes_included,
    v_overage_rate
  FROM customer_plans cpl
  WHERE cpl.id = v_plan_id;

  -- 2) Get total minutes used this cycle
  SELECT
    COALESCE(SUM(bu.amount), 0)
  INTO v_total_minutes
  FROM billing_usage bu
  WHERE bu.customer_id = p_customer_id
    AND bu.usage_type = 'voice_minutes'
    AND (v_cycle_start IS NULL OR bu.timestamp::date >= v_cycle_start)
    AND (v_cycle_end IS NULL OR bu.timestamp::date <= v_cycle_end);

  -- 3) Compute overage
  v_overage_minutes := GREATEST(v_total_minutes - v_minutes_included, 0);
  v_overage_cost := ROUND(v_overage_minutes * v_overage_rate, 2);
  v_base_cost := v_monthly_price;

  RETURN QUERY
  SELECT
    p_customer_id AS customer_id,
    v_plan_id AS customer_plan_id,
    v_plan_code AS plan_code,
    v_plan_name AS plan_name,
    v_monthly_price AS monthly_price,
    v_minutes_included AS minutes_included,
    v_overage_rate AS overage_rate,
    v_cycle_start AS billing_cycle_start,
    v_cycle_end AS billing_cycle_end,
    v_total_minutes AS total_minutes_used,
    v_overage_minutes AS overage_minutes,
    v_overage_cost AS overage_cost,
    v_base_cost AS base_cost,
    (v_base_cost + v_overage_cost) AS total_estimated_cost;
END;
$$;

-- Extend customer_minutes_summary view to include plan details for easier querying
DROP VIEW IF EXISTS customer_minutes_summary;

CREATE VIEW customer_minutes_summary AS
SELECT
  cp.id AS customer_id,
  cp.user_id,
  cp.customer_plan_id,
  cpl.name AS plan_name,
  cpl.minutes_included,
  cpl.overage_rate,
  cp.billing_cycle_start,
  cp.billing_cycle_end,
  cp.affiliate_id,
  COALESCE(SUM(
    CASE
      WHEN bu.usage_type = 'voice_minutes'
           AND (cp.billing_cycle_start IS NULL OR bu.timestamp::date >= cp.billing_cycle_start)
           AND (cp.billing_cycle_end IS NULL OR bu.timestamp::date <= cp.billing_cycle_end)
      THEN bu.amount
      ELSE 0
    END
  ), 0) AS total_minutes_used
FROM customer_profiles cp
LEFT JOIN customer_plans cpl ON cpl.id = cp.customer_plan_id
LEFT JOIN billing_usage bu ON bu.customer_id = cp.id
GROUP BY
  cp.id,
  cp.user_id,
  cp.customer_plan_id,
  cpl.name,
  cpl.minutes_included,
  cpl.overage_rate,
  cp.billing_cycle_start,
  cp.billing_cycle_end,
  cp.affiliate_id;