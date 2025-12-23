
-- Create consent_records table
CREATE TABLE public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_method TEXT NOT NULL DEFAULT 'explicit',
  ip_address TEXT,
  user_agent TEXT,
  consent_text TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data_requests table
CREATE TABLE public.data_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL,
  email TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_details JSONB DEFAULT '{}',
  requested_by TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT,
  verification_sent_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  rejection_reason TEXT,
  export_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data_retention_policies table
CREATE TABLE public.data_retention_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 365,
  applies_to_status TEXT[],
  auto_delete BOOLEAN NOT NULL DEFAULT false,
  anonymize_instead BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create privacy_settings table
CREATE TABLE public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  gdpr_enabled BOOLEAN NOT NULL DEFAULT true,
  ccpa_enabled BOOLEAN NOT NULL DEFAULT true,
  require_explicit_consent BOOLEAN NOT NULL DEFAULT true,
  cookie_banner_enabled BOOLEAN NOT NULL DEFAULT true,
  cookie_banner_text TEXT DEFAULT 'We use cookies to improve your experience and analyze site usage.',
  privacy_policy_url TEXT,
  dpo_name TEXT,
  dpo_email TEXT,
  data_retention_days INTEGER NOT NULL DEFAULT 730,
  auto_delete_inactive_leads BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_audit_log table
CREATE TABLE public.compliance_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  legal_basis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- consent_records policies
CREATE POLICY "consent_records_admin_all" ON public.consent_records
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "consent_records_public_insert" ON public.consent_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "consent_records_public_select_own" ON public.consent_records
  FOR SELECT USING (true);

-- data_requests policies
CREATE POLICY "data_requests_admin_all" ON public.data_requests
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "data_requests_public_insert" ON public.data_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "data_requests_public_select_own" ON public.data_requests
  FOR SELECT USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR verification_token IS NOT NULL);

-- data_retention_policies policies
CREATE POLICY "data_retention_policies_admin_all" ON public.data_retention_policies
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "data_retention_policies_authenticated_select" ON public.data_retention_policies
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- privacy_settings policies
CREATE POLICY "privacy_settings_admin_all" ON public.privacy_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "privacy_settings_public_select" ON public.privacy_settings
  FOR SELECT USING (true);

-- compliance_audit_log policies
CREATE POLICY "compliance_audit_log_admin_all" ON public.compliance_audit_log
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "compliance_audit_log_insert" ON public.compliance_audit_log
  FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_consent_records_email ON public.consent_records(email);
CREATE INDEX idx_consent_records_lead_id ON public.consent_records(lead_id);
CREATE INDEX idx_consent_records_consent_type ON public.consent_records(consent_type);
CREATE INDEX idx_data_requests_email ON public.data_requests(email);
CREATE INDEX idx_data_requests_status ON public.data_requests(status);
CREATE INDEX idx_data_requests_verification_token ON public.data_requests(verification_token);
CREATE INDEX idx_compliance_audit_log_event_type ON public.compliance_audit_log(event_type);
CREATE INDEX idx_compliance_audit_log_lead_id ON public.compliance_audit_log(lead_id);

-- Insert default retention policies
INSERT INTO public.data_retention_policies (data_type, retention_days, applies_to_status, auto_delete, anonymize_instead) VALUES
  ('leads', 730, ARRAY['lost', 'cold'], false, true),
  ('activities', 2555, NULL, false, false),
  ('emails', 2555, NULL, false, false),
  ('calls', 90, NULL, true, false),
  ('notes', 730, NULL, false, true),
  ('documents', 2555, NULL, false, false);
