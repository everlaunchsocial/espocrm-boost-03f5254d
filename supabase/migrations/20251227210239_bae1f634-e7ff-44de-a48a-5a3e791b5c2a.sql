-- Add affiliate_id to campaigns table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'affiliate_id') THEN
    ALTER TABLE campaigns ADD COLUMN affiliate_id uuid REFERENCES affiliates(id);
  END IF;
END $$;

-- Ensure campaigns has affiliate RLS (drop first if exists)
DROP POLICY IF EXISTS "campaigns_admin_all" ON campaigns;
DROP POLICY IF EXISTS "campaigns_affiliate_own" ON campaigns;

CREATE POLICY "campaigns_admin_all" 
ON campaigns FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "campaigns_affiliate_own" 
ON campaigns FOR ALL 
USING (affiliate_id IN (
  SELECT id FROM affiliates WHERE user_id = auth.uid()
))
WITH CHECK (affiliate_id IN (
  SELECT id FROM affiliates WHERE user_id = auth.uid()
));