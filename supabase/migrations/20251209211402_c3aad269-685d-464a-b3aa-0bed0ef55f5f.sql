-- Create SECURITY DEFINER function for public affiliate lookup by username
CREATE OR REPLACE FUNCTION public.get_affiliate_id_by_username(p_username text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM affiliates WHERE username = lower(p_username) LIMIT 1;
$$;