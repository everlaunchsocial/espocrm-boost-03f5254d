-- Create plan history table for audit trail
CREATE TABLE IF NOT EXISTS affiliate_plan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  old_plan_id uuid REFERENCES affiliate_plans(id),
  new_plan_id uuid REFERENCES affiliate_plans(id) NOT NULL,
  old_plan_code text,
  new_plan_code text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  stripe_subscription_id text,
  proration_amount_cents int,
  initiated_by text DEFAULT 'user'
);

-- Enable RLS
ALTER TABLE affiliate_plan_history ENABLE ROW LEVEL SECURITY;

-- Affiliates can see their own history
CREATE POLICY "plan_history_self_select" ON affiliate_plan_history FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Admins can see all
CREATE POLICY "plan_history_admin_all" ON affiliate_plan_history FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_plan_history_affiliate ON affiliate_plan_history(affiliate_id, changed_at DESC);