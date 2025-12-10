-- Create vapi_accounts table to manage multiple Vapi API keys
CREATE TABLE public.vapi_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  numbers_provisioned INTEGER NOT NULL DEFAULT 0,
  max_numbers INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - only admins can access (API keys are sensitive)
ALTER TABLE public.vapi_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vapi_accounts_admin_only" ON public.vapi_accounts
FOR ALL USING (is_admin());

-- Create customer_phone_numbers table to track provisioned phone numbers
CREATE TABLE public.customer_phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  vapi_account_id UUID NOT NULL REFERENCES vapi_accounts(id),
  phone_number TEXT NOT NULL,
  vapi_phone_id TEXT,
  vapi_assistant_id TEXT,
  area_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- Enable RLS
ALTER TABLE public.customer_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Customers can view their own phone number
CREATE POLICY "customer_phone_numbers_customer_self" ON public.customer_phone_numbers
FOR SELECT USING (
  customer_id IN (
    SELECT id FROM customer_profiles WHERE user_id = auth.uid()
  )
);

-- Admins can do everything
CREATE POLICY "customer_phone_numbers_admin_all" ON public.customer_phone_numbers
FOR ALL USING (is_admin());

-- Create index for faster lookups
CREATE INDEX idx_customer_phone_numbers_customer_id ON public.customer_phone_numbers(customer_id);
CREATE INDEX idx_vapi_accounts_active ON public.vapi_accounts(is_active, numbers_provisioned);