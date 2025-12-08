-- Fix security definer view warning by recreating with security invoker
DROP VIEW IF EXISTS customer_minutes_summary;

CREATE VIEW customer_minutes_summary 
WITH (security_invoker = true)
AS
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