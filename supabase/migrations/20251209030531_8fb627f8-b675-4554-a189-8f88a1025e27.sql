
-- Drop the existing admin policy that uses inline subquery
DROP POLICY IF EXISTS "affiliates_admin_all" ON public.affiliates;

-- Recreate using the security definer function
CREATE POLICY "affiliates_admin_all" ON public.affiliates
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Also fix genealogy table policy
DROP POLICY IF EXISTS "genealogy_admin_all" ON public.genealogy;

CREATE POLICY "genealogy_admin_all" ON public.genealogy
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Fix commission_plans policies that may have same issue
DROP POLICY IF EXISTS "commission_plans_admin_insert" ON public.commission_plans;
DROP POLICY IF EXISTS "commission_plans_admin_update" ON public.commission_plans;
DROP POLICY IF EXISTS "commission_plans_admin_delete" ON public.commission_plans;

CREATE POLICY "commission_plans_admin_insert" ON public.commission_plans
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "commission_plans_admin_update" ON public.commission_plans
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "commission_plans_admin_delete" ON public.commission_plans
FOR DELETE
TO authenticated
USING (is_admin());
