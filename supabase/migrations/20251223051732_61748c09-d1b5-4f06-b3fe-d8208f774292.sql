
-- Create table: white_label_configs
CREATE TABLE public.white_label_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT NOT NULL,
  custom_domain TEXT UNIQUE,
  domain_verified BOOLEAN NOT NULL DEFAULT false,
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1e40af',
  secondary_color TEXT NOT NULL DEFAULT '#64748b',
  accent_color TEXT NOT NULL DEFAULT '#0ea5e9',
  success_color TEXT DEFAULT '#10b981',
  warning_color TEXT DEFAULT '#f59e0b',
  error_color TEXT DEFAULT '#ef4444',
  background_color TEXT DEFAULT '#ffffff',
  background_dark_color TEXT DEFAULT '#1e293b',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  heading_font TEXT DEFAULT 'Inter',
  custom_css TEXT,
  email_from_name TEXT,
  email_from_address TEXT,
  email_reply_to TEXT,
  support_email TEXT,
  support_phone TEXT,
  custom_login_message TEXT,
  custom_login_tagline TEXT,
  login_background_type TEXT DEFAULT 'solid',
  login_background_value TEXT,
  hide_everlaunch_branding BOOLEAN NOT NULL DEFAULT false,
  custom_terms_url TEXT,
  custom_privacy_url TEXT,
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table: theme_presets
CREATE TABLE public.theme_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  colors JSONB NOT NULL DEFAULT '{}',
  fonts JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table: feature_toggles
CREATE TABLE public.feature_toggles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  custom_label TEXT,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, feature_key)
);

-- Create table: custom_pages
CREATE TABLE public.custom_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_slug TEXT NOT NULL,
  page_title TEXT NOT NULL,
  page_content TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, page_slug)
);

-- Enable RLS
ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for white_label_configs
CREATE POLICY "white_label_configs_admin_all" ON public.white_label_configs
  FOR ALL USING (is_admin());

CREATE POLICY "white_label_configs_org_member_read" ON public.white_label_configs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for theme_presets
CREATE POLICY "theme_presets_public_read" ON public.theme_presets
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "theme_presets_admin_all" ON public.theme_presets
  FOR ALL USING (is_admin());

CREATE POLICY "theme_presets_owner_manage" ON public.theme_presets
  FOR ALL USING (created_by = auth.uid());

-- RLS policies for feature_toggles
CREATE POLICY "feature_toggles_admin_all" ON public.feature_toggles
  FOR ALL USING (is_admin());

CREATE POLICY "feature_toggles_org_member_read" ON public.feature_toggles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for custom_pages
CREATE POLICY "custom_pages_public_read" ON public.custom_pages
  FOR SELECT USING (is_public = true AND published = true);

CREATE POLICY "custom_pages_admin_all" ON public.custom_pages
  FOR ALL USING (is_admin());

CREATE POLICY "custom_pages_org_member_read" ON public.custom_pages
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_white_label_configs_org ON public.white_label_configs(organization_id);
CREATE INDEX idx_white_label_configs_domain ON public.white_label_configs(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_feature_toggles_org ON public.feature_toggles(organization_id);
CREATE INDEX idx_custom_pages_org ON public.custom_pages(organization_id);
CREATE INDEX idx_custom_pages_slug ON public.custom_pages(organization_id, page_slug);

-- Insert default theme presets
INSERT INTO public.theme_presets (name, description, colors, fonts, is_public) VALUES
  ('Ocean', 'Cool blue tones for a professional look', '{"primary": "#1e40af", "secondary": "#64748b", "accent": "#0ea5e9", "success": "#10b981", "warning": "#f59e0b", "error": "#ef4444"}', '{"heading": "Inter", "body": "Inter", "monospace": "JetBrains Mono"}', true),
  ('Sunset', 'Warm orange and red tones', '{"primary": "#ea580c", "secondary": "#78716c", "accent": "#f59e0b", "success": "#22c55e", "warning": "#eab308", "error": "#dc2626"}', '{"heading": "Inter", "body": "Inter", "monospace": "JetBrains Mono"}', true),
  ('Forest', 'Natural green palette', '{"primary": "#166534", "secondary": "#64748b", "accent": "#22c55e", "success": "#10b981", "warning": "#f59e0b", "error": "#ef4444"}', '{"heading": "Inter", "body": "Inter", "monospace": "JetBrains Mono"}', true),
  ('Midnight', 'Dark elegant theme', '{"primary": "#6366f1", "secondary": "#94a3b8", "accent": "#8b5cf6", "success": "#22c55e", "warning": "#f59e0b", "error": "#ef4444"}', '{"heading": "Inter", "body": "Inter", "monospace": "JetBrains Mono"}', true);
