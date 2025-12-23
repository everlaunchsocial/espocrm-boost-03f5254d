import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export interface WhiteLabelConfig {
  id: string;
  organization_id: string | null;
  brand_name: string;
  custom_domain: string | null;
  domain_verified: boolean;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  success_color: string | null;
  warning_color: string | null;
  error_color: string | null;
  background_color: string | null;
  background_dark_color: string | null;
  font_family: string;
  heading_font: string | null;
  custom_css: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
  email_reply_to: string | null;
  support_email: string | null;
  support_phone: string | null;
  custom_login_message: string | null;
  custom_login_tagline: string | null;
  login_background_type: string | null;
  login_background_value: string | null;
  hide_everlaunch_branding: boolean;
  custom_terms_url: string | null;
  custom_privacy_url: string | null;
  social_links: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    success?: string;
    warning?: string;
    error?: string;
  };
  fonts: {
    heading?: string;
    body?: string;
    monospace?: string;
  };
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

export interface FeatureToggle {
  id: string;
  organization_id: string;
  feature_key: string;
  enabled: boolean;
  custom_label: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomPage {
  id: string;
  organization_id: string;
  page_slug: string;
  page_title: string;
  page_content: string;
  is_public: boolean;
  published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_FEATURES = [
  { key: 'lead_management', label: 'Lead Management', category: 'core', alwaysEnabled: true },
  { key: 'activity_timeline', label: 'Activity Timeline', category: 'core', alwaysEnabled: true },
  { key: 'voice_summary', label: 'Voice Executive Summary', category: 'ai' },
  { key: 'ai_follow_ups', label: 'AI Follow-Up Suggestions', category: 'ai' },
  { key: 'sentiment_analysis', label: 'Sentiment Analysis', category: 'ai' },
  { key: 'ai_call_scripts', label: 'AI Call Scripts', category: 'ai' },
  { key: 'call_recording', label: 'Call Recording & Analysis', category: 'ai' },
  { key: 'auto_follow_ups', label: 'Auto-Send Follow-Ups', category: 'automation' },
  { key: 'campaign_orchestrator', label: 'Campaign Orchestrator', category: 'automation' },
  { key: 'task_automation', label: 'Task Automation', category: 'automation' },
  { key: 'email_integration', label: 'Email Integration', category: 'integrations' },
  { key: 'calendar_sync', label: 'Calendar Sync', category: 'integrations' },
  { key: 'slack_integration', label: 'Slack', category: 'integrations' },
  { key: 'zapier_integration', label: 'Zapier', category: 'integrations' },
];

export function useWhiteLabelConfig(organizationId?: string) {
  const { isEnabled } = useFeatureFlags();
  
  return useQuery({
    queryKey: ['white-label-config', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (error) throw error;
      return data as WhiteLabelConfig | null;
    },
    enabled: !!organizationId && isEnabled('aiCrmPhase4'),
  });
}

export function useThemePresets() {
  const { isEnabled } = useFeatureFlags();
  
  return useQuery({
    queryKey: ['theme-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_presets')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return (data || []).map(preset => ({
        ...preset,
        colors: (preset.colors || {}) as ThemePreset['colors'],
        fonts: (preset.fonts || {}) as ThemePreset['fonts'],
      })) as ThemePreset[];
    },
    enabled: isEnabled('aiCrmPhase4'),
  });
}

export function useFeatureToggles(organizationId?: string) {
  const { isEnabled } = useFeatureFlags();
  
  return useQuery({
    queryKey: ['feature-toggles', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('feature_toggles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('display_order');
      
      if (error) throw error;
      return (data || []) as FeatureToggle[];
    },
    enabled: !!organizationId && isEnabled('aiCrmPhase4'),
  });
}

export function useCustomPages(organizationId?: string) {
  const { isEnabled } = useFeatureFlags();
  
  return useQuery({
    queryKey: ['custom-pages', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('organization_id', organizationId)
        .order('page_title');
      
      if (error) throw error;
      return (data || []) as CustomPage[];
    },
    enabled: !!organizationId && isEnabled('aiCrmPhase4'),
  });
}

export function useSaveWhiteLabelConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: Partial<WhiteLabelConfig> & { organization_id: string }) => {
      const { data: existing } = await supabase
        .from('white_label_configs')
        .select('id')
        .eq('organization_id', config.organization_id)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from('white_label_configs')
          .update({ ...config, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('white_label_configs')
          .insert(config as any)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['white-label-config', variables.organization_id] });
    },
  });
}

export function useSaveFeatureToggle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (toggle: Partial<FeatureToggle> & { organization_id: string; feature_key: string }) => {
      const { data: existing } = await supabase
        .from('feature_toggles')
        .select('id')
        .eq('organization_id', toggle.organization_id)
        .eq('feature_key', toggle.feature_key)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from('feature_toggles')
          .update({ ...toggle, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('feature_toggles')
          .insert(toggle as any)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feature-toggles', variables.organization_id] });
    },
  });
}

export function useSaveCustomPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (page: Partial<CustomPage> & { organization_id: string }) => {
      if (page.id) {
        const { data, error } = await supabase
          .from('custom_pages')
          .update({ ...page, updated_at: new Date().toISOString() })
          .eq('id', page.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('custom_pages')
          .insert(page as any)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom-pages', variables.organization_id] });
    },
  });
}

export function useDeleteCustomPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from('custom_pages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-pages', data.organizationId] });
    },
  });
}
