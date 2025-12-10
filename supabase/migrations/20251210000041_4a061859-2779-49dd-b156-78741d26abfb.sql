-- Add demo credits columns to affiliates
ALTER TABLE affiliates
ADD COLUMN IF NOT EXISTS demo_credits_remaining int DEFAULT 0,
ADD COLUMN IF NOT EXISTS demo_credits_used_this_month int DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_cycle_start date DEFAULT CURRENT_DATE;

-- Create affiliate_credit_purchases table
CREATE TABLE IF NOT EXISTS affiliate_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) NOT NULL,
  credits_purchased int NOT NULL,
  amount_cents int NOT NULL,
  stripe_payment_intent_id text,
  purchased_at timestamptz DEFAULT now()
);

ALTER TABLE affiliate_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_purchases_self ON affiliate_credit_purchases FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Create affiliate_billing_history table
CREATE TABLE IF NOT EXISTS affiliate_billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) NOT NULL,
  description text NOT NULL,
  amount_cents int NOT NULL,
  status text DEFAULT 'paid',
  stripe_invoice_id text,
  invoice_pdf_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE affiliate_billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_history_self ON affiliate_billing_history FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));