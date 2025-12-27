-- Create billing_configurations table
CREATE TABLE public.billing_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  setup_fee NUMERIC NOT NULL DEFAULT 999,
  charge_first_month BOOLEAN NOT NULL DEFAULT false,
  billing_delay_days INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create billing_configuration_changes audit table
CREATE TABLE public.billing_configuration_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changed_by UUID REFERENCES auth.users(id),
  old_configuration_name TEXT,
  new_configuration_name TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  note TEXT
);

-- Enable RLS
ALTER TABLE public.billing_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_configuration_changes ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_configurations
CREATE POLICY "billing_configurations_public_read" ON public.billing_configurations
  FOR SELECT USING (true);

CREATE POLICY "billing_configurations_super_admin_all" ON public.billing_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role = 'super_admin'
    )
  );

-- RLS policies for billing_configuration_changes
CREATE POLICY "billing_configuration_changes_admin_read" ON public.billing_configuration_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "billing_configuration_changes_super_admin_insert" ON public.billing_configuration_changes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role = 'super_admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_billing_configurations_updated_at
  BEFORE UPDATE ON public.billing_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 3 billing configurations
INSERT INTO public.billing_configurations (name, display_name, is_active, setup_fee, charge_first_month, billing_delay_days, description)
VALUES 
  ('first_month_included', 'First Month Included', true, 999, false, 30, 'Setup fee includes your first month free. Monthly billing begins 30 days after signup, giving us time to fully integrate with your systems.'),
  ('grace_period_15', '15-Day Grace Period', false, 999, false, 15, 'Monthly billing starts 15 days after signup, giving us time to integrate with your website.'),
  ('immediate_billing', 'Immediate Billing', false, 999, true, 0, 'Get started immediately. Setup fee plus first month charged at signup.');