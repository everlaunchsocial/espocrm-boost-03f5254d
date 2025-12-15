-- ============================================================
-- EXPENSES SERVICES TABLE - Core service catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('Platform', 'Voice AI', 'Video', 'Development', 'Domains', 'Email', 'Payments', 'Data')),
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('fixed_monthly', 'usage_based', 'annual', 'per_transaction')),
  base_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_plan TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'review_needed', 'redundant', 'cancelled')),
  cost_attribution TEXT NOT NULL CHECK (cost_attribution IN ('platform', 'acquisition', 'delivery', 'development')),
  attribution_split JSONB DEFAULT '{}',
  primary_purpose TEXT,
  cancellation_impact TEXT,
  billing_portal_url TEXT,
  last_reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for expenses_services
CREATE INDEX IF NOT EXISTS idx_expenses_services_status ON public.expenses_services(status);
CREATE INDEX IF NOT EXISTS idx_expenses_services_category ON public.expenses_services(category);
CREATE INDEX IF NOT EXISTS idx_expenses_services_attribution ON public.expenses_services(cost_attribution);

-- Enable RLS
ALTER TABLE public.expenses_services ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admin only
CREATE POLICY "expenses_services_super_admin_all" ON public.expenses_services
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- EXPENSES MONTHLY TABLE - Monthly invoice/actual tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.expenses_services(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  budgeted_amount NUMERIC(10,2),
  actual_amount NUMERIC(10,2),
  is_overdue BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, month)
);

-- Indexes for expenses_monthly
CREATE INDEX IF NOT EXISTS idx_expenses_monthly_month ON public.expenses_monthly(month);
CREATE INDEX IF NOT EXISTS idx_expenses_monthly_overdue ON public.expenses_monthly(is_overdue) WHERE is_overdue = true;

-- Enable RLS
ALTER TABLE public.expenses_monthly ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admin only
CREATE POLICY "expenses_monthly_super_admin_all" ON public.expenses_monthly
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- SEED DATA - 12 exact services
-- ============================================================
INSERT INTO public.expenses_services (service_name, category, pricing_model, base_cost, current_plan, status, cost_attribution, primary_purpose, cancellation_impact, notes)
VALUES 
  ('Lovable Labs', 'Platform', 'fixed_monthly', 500.00, 'Pro 6', 'active', 'platform', 'Development platform, hosting, Supabase, edge functions', 'CRITICAL - Entire platform goes down', 'Past due: $212.50'),
  ('Vapi', 'Voice AI', 'usage_based', 20.00, 'Standard', 'active', 'delivery', 'Voice AI orchestration - bundles Deepgram/Cartesia/DeepSeek', 'CRITICAL - Customer phone calls stop', NULL),
  ('HeyGen', 'Video', 'fixed_monthly', 54.99, 'Creator Unlimited', 'review_needed', 'acquisition', 'Video creation for training materials and investor presentations', 'Training videos need manual creation', NULL),
  ('Replit', 'Development', 'usage_based', 68.21, 'Core', 'active', 'development', 'Debugging and AI agent testing', 'Development workflow slowed', 'base $25 + $43.21 overage'),
  ('ChatGPT Pro', 'Development', 'fixed_monthly', 21.25, 'Plus', 'review_needed', 'development', 'Development assistance via web interface', 'Redundant with OpenAI API', NULL),
  ('Claude Pro', 'Development', 'fixed_monthly', 21.25, 'Pro', 'active', 'development', 'Development assistance - heavily used', 'Development significantly impacted', NULL),
  ('OpenAI API', 'Voice AI', 'usage_based', 10.00, 'Pay as you go', 'active', 'acquisition', 'Web voice demo (realtime-session) only', 'Demo voice stops working', NULL),
  ('ElevenLabs', 'Voice AI', 'fixed_monthly', 5.31, 'Starter', 'redundant', 'acquisition', 'Alternative voice (rarely used)', 'Minimal impact', 'Savings if cancelled: $64/year'),
  ('GoDaddy Domains', 'Domains', 'annual', 20.00, 'Standard', 'active', 'platform', 'tryeverlaunch.com, everlaunch.ai, everlaunchsocial.com, localsearch365.com', 'Websites offline', NULL),
  ('Resend', 'Email', 'usage_based', 0.00, 'Free tier', 'active', 'platform', 'Transactional emails (invoices, notifications, demo emails)', 'CRITICAL - No notifications', NULL),
  ('Stripe', 'Payments', 'per_transaction', 0.00, 'Standard', 'active', 'platform', 'Payment processing - 2.9% + $0.30', 'CRITICAL - Cannot accept payments', NULL),
  ('Firecrawl', 'Data', 'usage_based', 0.00, 'Free tier', 'review_needed', 'acquisition', 'Website scraping for demo screenshots', 'Manual screenshots needed', NULL)
ON CONFLICT (service_name) DO NOTHING;

-- Seed initial overdue invoice for Lovable Labs (December 2024)
INSERT INTO public.expenses_monthly (service_id, month, budgeted_amount, actual_amount, is_overdue, notes)
SELECT id, '2024-12-01'::date, 500.00, 212.50, true, '{"reason": "Past due balance"}'::jsonb
FROM public.expenses_services WHERE service_name = 'Lovable Labs'
ON CONFLICT (service_id, month) DO NOTHING;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_expenses_services_updated_at
  BEFORE UPDATE ON public.expenses_services
  FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at();

CREATE TRIGGER update_expenses_monthly_updated_at
  BEFORE UPDATE ON public.expenses_monthly
  FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at();