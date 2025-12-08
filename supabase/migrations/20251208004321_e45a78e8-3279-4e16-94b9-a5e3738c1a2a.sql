-- PHASE A — ROLES & RLS

-- 1. Create profiles table with global_role
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  global_role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can read/update their own profile, admins can do everything
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.global_role IN ('super_admin', 'admin')
    )
  );

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, global_role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.1 commission_plans policies
CREATE POLICY "commission_plans_select_all_auth" ON public.commission_plans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "commission_plans_admin_insert" ON public.commission_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "commission_plans_admin_update" ON public.commission_plans
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "commission_plans_admin_delete" ON public.commission_plans
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

-- 3.2 affiliates policies
CREATE POLICY "affiliates_admin_all" ON public.affiliates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "affiliates_self_select" ON public.affiliates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "affiliates_self_update" ON public.affiliates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3.3 genealogy policies
CREATE POLICY "genealogy_admin_all" ON public.genealogy
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "genealogy_affiliate_self" ON public.genealogy
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (
      SELECT affiliates.id FROM public.affiliates
      WHERE affiliates.user_id = auth.uid()
    )
  );

-- 3.4 affiliate_commissions policies
CREATE POLICY "affiliate_commissions_admin_all" ON public.affiliate_commissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "affiliate_commissions_affiliate_own" ON public.affiliate_commissions
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (
      SELECT affiliates.id FROM public.affiliates
      WHERE affiliates.user_id = auth.uid()
    )
  );

-- 3.5 customer_profiles policies
CREATE POLICY "customer_profiles_admin_all" ON public.customer_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "customer_profiles_customer_self" ON public.customer_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "customer_profiles_affiliate_view" ON public.customer_profiles
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (
      SELECT affiliates.id FROM public.affiliates
      WHERE affiliates.user_id = auth.uid()
    )
  );

-- 3.6 billing_subscriptions policies
CREATE POLICY "billing_subscriptions_admin_all" ON public.billing_subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "billing_subscriptions_customer_self" ON public.billing_subscriptions
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  );

-- 3.7 billing_usage policies
CREATE POLICY "billing_usage_admin_all" ON public.billing_usage
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "billing_usage_customer_self" ON public.billing_usage
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  );

-- 3.8 usage_logs policies
CREATE POLICY "usage_logs_admin_all" ON public.usage_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "usage_logs_customer_self" ON public.usage_logs
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  );

-- 3.9 voice_settings policies
CREATE POLICY "voice_settings_admin_all" ON public.voice_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "voice_settings_customer_self" ON public.voice_settings
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "voice_settings_customer_update" ON public.voice_settings
  FOR UPDATE TO authenticated
  USING (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  );

-- 3.9 chat_settings policies
CREATE POLICY "chat_settings_admin_all" ON public.chat_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "chat_settings_customer_self" ON public.chat_settings
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_settings_customer_update" ON public.chat_settings
  FOR UPDATE TO authenticated
  USING (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  );

-- 3.10 twilio_numbers policies
CREATE POLICY "twilio_numbers_admin_all" ON public.twilio_numbers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "twilio_numbers_customer_self" ON public.twilio_numbers
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT customer_profiles.id FROM public.customer_profiles
      WHERE customer_profiles.user_id = auth.uid()
    )
  );

-- 3.11 payouts policies
CREATE POLICY "payouts_admin_all" ON public.payouts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "payouts_affiliate_self" ON public.payouts
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (
      SELECT affiliates.id FROM public.affiliates
      WHERE affiliates.user_id = auth.uid()
    )
  );