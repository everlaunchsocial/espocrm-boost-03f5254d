-- Fix: Recreate view with explicit SECURITY INVOKER to address security linter warning
DROP VIEW IF EXISTS customer_minutes_summary;

CREATE VIEW customer_minutes_summary 
WITH (security_invoker = true)
AS
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