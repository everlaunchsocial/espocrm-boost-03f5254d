-- Drop the problematic policy that causes infinite recursion
-- (is_super_admin() queries profiles table, causing loop)
DROP POLICY IF EXISTS profiles_admin_all ON profiles;

-- The existing profiles_self_select policy remains:
-- USING (user_id = auth.uid()) - allows users to read their own profile

-- Add a simple self-update policy (no recursion)
CREATE POLICY profiles_self_update 
ON profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());