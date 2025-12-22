-- Drop the insecure view
DROP VIEW IF EXISTS public.crm_team_members;

-- Create a secure function to get CRM team members
CREATE OR REPLACE FUNCTION public.get_crm_team_members()
RETURNS TABLE (
  user_id UUID,
  global_role TEXT,
  email TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.global_role,
    p.user_id::text as email -- We'll use user_id as identifier, email fetched client-side if needed
  FROM public.profiles p
  WHERE p.global_role IN ('super_admin', 'admin', 'affiliate')
$$;