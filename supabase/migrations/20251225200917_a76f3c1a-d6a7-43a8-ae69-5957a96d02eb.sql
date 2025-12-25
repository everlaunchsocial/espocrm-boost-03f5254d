-- Add RLS policy so admins can see ALL affiliates
CREATE POLICY "affiliates_admin_view" ON affiliates
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND global_role IN ('super_admin', 'admin')
  )
);