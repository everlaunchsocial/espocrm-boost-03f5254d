-- Add tracking columns for onboarding notifications
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_reminder_24h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_reminder_48h_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries on incomplete onboarding
CREATE INDEX IF NOT EXISTS idx_customer_profiles_incomplete_onboarding 
ON customer_profiles (payment_received_at, onboarding_stage) 
WHERE payment_received_at IS NOT NULL AND (onboarding_stage IS NULL OR onboarding_stage != 'completed');

-- Create helper function to get incomplete onboarding customers (for admins)
CREATE OR REPLACE FUNCTION public.get_incomplete_onboarding_customers(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  contact_name TEXT,
  lead_email TEXT,
  affiliate_id UUID,
  affiliate_username TEXT,
  payment_received_at TIMESTAMPTZ,
  onboarding_stage TEXT,
  hours_since_payment NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cp.id,
    cp.business_name,
    cp.contact_name,
    cp.lead_email,
    cp.affiliate_id,
    a.username as affiliate_username,
    cp.payment_received_at,
    cp.onboarding_stage,
    EXTRACT(EPOCH FROM (NOW() - cp.payment_received_at))/3600 as hours_since_payment
  FROM customer_profiles cp
  LEFT JOIN affiliates a ON a.id = cp.affiliate_id
  WHERE 
    cp.payment_received_at IS NOT NULL
    AND (cp.onboarding_stage IS NULL OR cp.onboarding_stage NOT IN ('completed', 'done'))
  ORDER BY cp.payment_received_at ASC
  LIMIT p_limit;
$$;

-- Create function for affiliates to get their incomplete onboarding customers
CREATE OR REPLACE FUNCTION public.get_my_incomplete_customers()
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  contact_name TEXT,
  lead_email TEXT,
  payment_received_at TIMESTAMPTZ,
  onboarding_stage TEXT,
  hours_since_payment NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cp.id,
    cp.business_name,
    cp.contact_name,
    cp.lead_email,
    cp.payment_received_at,
    cp.onboarding_stage,
    EXTRACT(EPOCH FROM (NOW() - cp.payment_received_at))/3600 as hours_since_payment
  FROM customer_profiles cp
  JOIN affiliates a ON a.id = cp.affiliate_id AND a.user_id = auth.uid()
  WHERE 
    cp.payment_received_at IS NOT NULL
    AND (cp.onboarding_stage IS NULL OR cp.onboarding_stage NOT IN ('completed', 'done'))
  ORDER BY cp.payment_received_at ASC;
$$;