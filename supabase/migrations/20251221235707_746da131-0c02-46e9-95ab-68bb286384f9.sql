-- Fix search_path for get_pipeline_status_order function
CREATE OR REPLACE FUNCTION public.get_pipeline_status_order(p_status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE p_status
    WHEN 'new_lead' THEN 1
    WHEN 'contact_attempted' THEN 2
    WHEN 'demo_created' THEN 3
    WHEN 'demo_sent' THEN 4
    WHEN 'demo_engaged' THEN 5
    WHEN 'ready_to_buy' THEN 6
    WHEN 'customer_won' THEN 7
    WHEN 'lost_closed' THEN 8
    ELSE 0
  END;
$$;