-- Add INSERT policy for affiliates table so new users can create their own affiliate record
CREATE POLICY "affiliates_self_insert" ON public.affiliates
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());