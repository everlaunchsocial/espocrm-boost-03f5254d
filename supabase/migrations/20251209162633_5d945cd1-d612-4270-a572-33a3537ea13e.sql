-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS affiliates_view_sponsor ON affiliates;

-- Create a SECURITY DEFINER function to safely get the current user's parent_affiliate_id
-- This bypasses RLS, preventing the recursive loop
CREATE OR REPLACE FUNCTION public.get_my_parent_affiliate_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parent_affiliate_id 
  FROM affiliates 
  WHERE user_id = auth.uid() 
  LIMIT 1
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_parent_affiliate_id() TO authenticated;

-- Recreate the policy using the function (no subquery = no recursion)
CREATE POLICY affiliates_view_sponsor 
ON affiliates FOR SELECT
USING (id = get_my_parent_affiliate_id());