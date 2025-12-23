-- Create integrations table (marketplace catalog)
CREATE TABLE public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_beta BOOLEAN NOT NULL DEFAULT false,
  requires_api_key BOOLEAN NOT NULL DEFAULT false,
  requires_oauth BOOLEAN NOT NULL DEFAULT false,
  documentation_url TEXT,
  setup_instructions TEXT,
  pricing_info JSONB,
  features JSONB DEFAULT '[]'::jsonb,
  use_cases JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_integrations table
CREATE TABLE public.user_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_auth',
  config JSONB DEFAULT '{}'::jsonb,
  credentials JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, integration_id)
);

-- Create integration_logs table
CREATE TABLE public.integration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_integration_id UUID NOT NULL REFERENCES public.user_integrations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- Integrations policies (public read for active integrations)
CREATE POLICY "integrations_public_read" ON public.integrations
  FOR SELECT USING (is_active = true);

CREATE POLICY "integrations_admin_all" ON public.integrations
  FOR ALL USING (is_admin());

-- User integrations policies
CREATE POLICY "user_integrations_own" ON public.user_integrations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "user_integrations_admin_all" ON public.user_integrations
  FOR ALL USING (is_admin());

-- Integration logs policies
CREATE POLICY "integration_logs_own" ON public.integration_logs
  FOR SELECT USING (
    user_integration_id IN (
      SELECT id FROM public.user_integrations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "integration_logs_admin_all" ON public.integration_logs
  FOR ALL USING (is_admin());

-- Indexes
CREATE INDEX idx_integrations_category ON public.integrations(category);
CREATE INDEX idx_integrations_slug ON public.integrations(slug);
CREATE INDEX idx_user_integrations_user ON public.user_integrations(user_id);
CREATE INDEX idx_user_integrations_status ON public.user_integrations(status);
CREATE INDEX idx_integration_logs_user_integration ON public.integration_logs(user_integration_id);
CREATE INDEX idx_integration_logs_created ON public.integration_logs(created_at DESC);

-- Insert default integrations
INSERT INTO public.integrations (name, slug, category, description, logo_url, requires_api_key, requires_oauth, features, use_cases, pricing_info) VALUES
('Zapier', 'zapier', 'automation', 'Connect to 5,000+ apps with no code. Automate workflows between EverLaunch and your favorite tools.', '/integrations/zapier.svg', true, false, 
  '["Trigger zaps when leads are created", "Update leads from other apps", "Create tasks from external sources", "Send notifications to other tools"]'::jsonb,
  '["Enrich leads with Clearbit data", "Add Typeform responses as leads", "Post to Slack when deals close", "Create Trello cards from tasks"]'::jsonb,
  '{"free_tier": "100 tasks/month", "paid_from": "$19.99/month"}'::jsonb),

('Slack', 'slack', 'communication', 'Post notifications to channels, reply to Slack to add CRM notes, and get daily digests.', '/integrations/slack.svg', false, true,
  '["Real-time notifications", "Team collaboration", "Daily digest summaries", "Bidirectional messaging"]'::jsonb,
  '["Team notifications", "Deal alerts", "Collaboration", "Activity feeds"]'::jsonb,
  '{"free_tier": "Unlimited", "paid_from": "Free"}'::jsonb),

('Google Workspace', 'google-workspace', 'productivity', 'Integrate with Gmail, Calendar, Drive, and Contacts for seamless productivity.', '/integrations/google.svg', false, true,
  '["Send emails via Gmail", "Two-way calendar sync", "Store documents in Drive", "Sync contacts"]'::jsonb,
  '["Email integration", "Calendar sync", "Document storage", "Contact management"]'::jsonb,
  '{"free_tier": "Personal accounts", "paid_from": "$6/user/month"}'::jsonb),

('Calendly', 'calendly', 'calendar', 'Scheduling and meeting automation. Auto-create leads from bookings.', '/integrations/calendly.svg', true, false,
  '["Auto-create leads from bookings", "Add meeting notes to CRM", "Sync to calendar", "Custom question mapping"]'::jsonb,
  '["Demo scheduling", "Lead capture", "Meeting management"]'::jsonb,
  '{"free_tier": "1 event type", "paid_from": "$10/month"}'::jsonb),

('HubSpot', 'hubspot', 'crm', 'Two-way lead sync, activity sync, and deal pipeline synchronization.', '/integrations/hubspot.svg', true, true,
  '["Two-way lead sync", "Activity synchronization", "Deal pipeline sync", "Contact enrichment"]'::jsonb,
  '["Multi-CRM setup", "Migration", "Data backup"]'::jsonb,
  '{"free_tier": "Basic CRM", "paid_from": "$45/month"}'::jsonb),

('Mailchimp', 'mailchimp', 'marketing', 'Email marketing platform. Sync contacts and track email engagement.', '/integrations/mailchimp.svg', true, false,
  '["Sync contacts to lists", "Track email opens", "Update lead status", "Segment audiences"]'::jsonb,
  '["Email marketing", "Campaigns", "Lead nurturing"]'::jsonb,
  '{"free_tier": "500 contacts", "paid_from": "$13/month"}'::jsonb),

('Twilio', 'twilio', 'phone', 'Send SMS from CRM, log calls automatically, and transcribe voicemails.', '/integrations/twilio.svg', true, false,
  '["Send SMS from CRM", "Log calls automatically", "Voicemail transcription", "Click-to-call"]'::jsonb,
  '["SMS follow-ups", "Call tracking", "Communication logs"]'::jsonb,
  '{"free_tier": "Trial credits", "paid_from": "Pay as you go"}'::jsonb),

('DocuSign', 'docusign', 'documents', 'Send contracts for signature, auto-update status when signed.', '/integrations/docusign.svg', true, true,
  '["Send contracts for signature", "Auto-update on signing", "Store signed documents", "Template library"]'::jsonb,
  '["Contract management", "E-signatures", "Document tracking"]'::jsonb,
  '{"free_tier": "3 sends/month", "paid_from": "$10/month"}'::jsonb),

('Stripe', 'stripe', 'payment', 'Track payments, auto-create invoices, and update leads on payment.', '/integrations/stripe.svg', true, false,
  '["Track payments", "Auto-create invoices", "Update lead on payment", "Revenue reporting"]'::jsonb,
  '["Payment tracking", "Billing", "Revenue analytics"]'::jsonb,
  '{"free_tier": "No monthly fee", "paid_from": "2.9% + 30¢ per transaction"}'::jsonb),

('QuickBooks', 'quickbooks', 'accounting', 'Sync customers, create invoices, and track revenue.', '/integrations/quickbooks.svg', true, true,
  '["Sync customers", "Create invoices", "Track revenue", "Financial reporting"]'::jsonb,
  '["Accounting", "Invoicing", "Financial reports"]'::jsonb,
  '{"free_tier": "30-day trial", "paid_from": "$30/month"}'::jsonb);