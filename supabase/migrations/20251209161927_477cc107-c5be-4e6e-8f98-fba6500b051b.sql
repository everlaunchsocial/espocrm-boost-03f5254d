-- Allow affiliates to view their sponsor's record (parent_affiliate_id)
CREATE POLICY affiliates_view_sponsor 
ON affiliates FOR SELECT
USING (
  id IN (
    SELECT parent_affiliate_id 
    FROM affiliates 
    WHERE user_id = auth.uid()
  )
);