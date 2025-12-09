-- Drop the broken RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "affiliates_view_direct_downline" ON public.affiliates;

-- Create a security definer function to get affiliate ID without triggering RLS
CREATE OR REPLACE FUNCTION public.get_own_affiliate_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM affiliates WHERE user_id = _user_id LIMIT 1
$$;

-- Recreate the policy using the function to avoid recursion
CREATE POLICY "affiliates_view_direct_downline"
ON public.affiliates
FOR SELECT
USING (
  parent_affiliate_id = public.get_own_affiliate_id(auth.uid())
);