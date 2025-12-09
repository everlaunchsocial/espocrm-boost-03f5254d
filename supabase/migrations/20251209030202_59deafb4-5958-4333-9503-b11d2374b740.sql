
-- Add policy to allow the user to read their own profile (make sure it works)
-- The issue is the profiles_self_select only uses USING, let's verify auth.uid() works

-- First, let's create a helper function that admins can use to check roles without RLS issues
CREATE OR REPLACE FUNCTION public.get_my_global_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT global_role FROM profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_global_role() TO authenticated;
