-- Create a more reliable RPC that accepts user_id as parameter
CREATE OR REPLACE FUNCTION public.get_global_role_for_user(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT global_role FROM profiles WHERE user_id = p_user_id LIMIT 1
$$;