
-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL DEFAULT 'credit_card',
  transaction_id TEXT,
  reference_number TEXT,
  notes TEXT
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.leads(id),
  plan_amount NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE,
  end_date DATE,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  payment_method_id TEXT
);

-- Create commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id UUID NOT NULL REFERENCES public.profiles(user_id),
  deal_id UUID REFERENCES public.leads(id),
  deal_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0.10,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  approved_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT
);

-- Create revenue_targets table
CREATE TABLE public.revenue_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_owner_id UUID REFERENCES public.profiles(user_id),
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  achievement_percentage NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  target_type TEXT NOT NULL DEFAULT 'individual',
  period_type TEXT NOT NULL DEFAULT 'monthly'
);

-- Enable RLS on all tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "payments_authenticated_all" ON public.payments
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for subscriptions
CREATE POLICY "subscriptions_authenticated_all" ON public.subscriptions
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for commissions
CREATE POLICY "commissions_own_select" ON public.commissions
  FOR SELECT USING (rep_id = auth.uid() OR is_admin());

CREATE POLICY "commissions_admin_all" ON public.commissions
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- RLS policies for revenue_targets
CREATE POLICY "revenue_targets_own_select" ON public.revenue_targets
  FOR SELECT USING (target_owner_id = auth.uid() OR is_admin());

CREATE POLICY "revenue_targets_admin_all" ON public.revenue_targets
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- Indexes for performance
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_commissions_rep_id ON public.commissions(rep_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_revenue_targets_owner ON public.revenue_targets(target_owner_id);
