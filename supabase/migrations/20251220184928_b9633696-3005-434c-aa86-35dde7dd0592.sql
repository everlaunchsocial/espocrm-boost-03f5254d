-- Fix: Revoke public API access to materialized view
REVOKE ALL ON public.quality_patterns_weekly FROM anon, authenticated;

-- Grant access only to service role (for edge functions)
GRANT SELECT ON public.quality_patterns_weekly TO service_role;