import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'cold_outreach' | 'follow_up' | 'demo_invite' | 'nurture' | 'reactivation' | 'closing';
  subject_line: string;
  body_html: string;
  body_plain: string;
  variables: string[];
  is_active: boolean;
  is_global: boolean;
  created_by: string | null;
  performance_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmailVariant {
  id: string;
  template_id: string;
  variant_name: string;
  subject_line: string;
  body_html: string;
  body_plain: string;
  weight: number;
  is_active: boolean;
  created_at: string;
}

export interface EmailSend {
  id: string;
  template_id: string | null;
  variant_id: string | null;
  lead_id: string | null;
  subject_line: string;
  body_html: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  bounced: boolean;
  unsubscribed: boolean;
}

export interface TemplateWithStats extends EmailTemplate {
  sent_count: number;
  open_rate: number;
  reply_rate: number;
  click_rate: number;
}

export const TEMPLATE_CATEGORIES = [
  { value: 'cold_outreach', label: 'Cold Outreach', icon: '❄️' },
  { value: 'follow_up', label: 'Follow-Up', icon: '🔄' },
  { value: 'demo_invite', label: 'Demo Invite', icon: '🎬' },
  { value: 'nurture', label: 'Nurture', icon: '🌱' },
  { value: 'reactivation', label: 'Reactivation', icon: '🔥' },
  { value: 'closing', label: 'Closing', icon: '🎯' },
] as const;

export const TEMPLATE_VARIABLES = [
  { key: 'first_name', label: 'First Name', description: "Lead's first name" },
  { key: 'last_name', label: 'Last Name', description: "Lead's last name" },
  { key: 'company', label: 'Company', description: 'Company name' },
  { key: 'industry', label: 'Industry', description: 'Industry/vertical' },
  { key: 'sender_name', label: 'Sender Name', description: 'Your name' },
  { key: 'demo_link', label: 'Demo Link', description: 'Personalized demo link' },
  { key: 'calendar_link', label: 'Calendar Link', description: 'Booking calendar link' },
  { key: 'pain_point', label: 'Pain Point', description: 'AI-detected pain point' },
  { key: 'connection', label: 'Connection', description: 'Mutual connection name' },
  { key: 'call_summary', label: 'Call Summary', description: 'Summary of previous call' },
  { key: 'next_steps', label: 'Next Steps', description: 'Agreed upon next steps' },
  { key: 'offer_details', label: 'Offer Details', description: 'Special offer information' },
];

// Fetch all templates
export function useEmailTemplates() {
  const isEnabled = useFeatureFlags(state => state.isEnabled);

  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: isEnabled('aiCrmPhase4'),
  });
}

// Fetch templates with performance stats
export function useTemplatesWithStats() {
  const isEnabled = useFeatureFlags(state => state.isEnabled);

  return useQuery({
    queryKey: ['email-templates-with-stats'],
    enabled: isEnabled('aiCrmPhase4'),
    queryFn: async () => {
      // Fetch templates
      const { data: templates, error: templatesError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('performance_score', { ascending: false, nullsFirst: false });

      if (templatesError) throw templatesError;

      // Fetch sends for stats
      const { data: sends, error: sendsError } = await supabase
        .from('email_sends')
        .select('template_id, opened_at, clicked_at, replied_at');

      if (sendsError) throw sendsError;

      // Calculate stats for each template
      const templatesWithStats: TemplateWithStats[] = (templates as EmailTemplate[]).map(template => {
        const templateSends = sends?.filter(s => s.template_id === template.id) || [];
        const sentCount = templateSends.length;
        const openCount = templateSends.filter(s => s.opened_at).length;
        const clickCount = templateSends.filter(s => s.clicked_at).length;
        const replyCount = templateSends.filter(s => s.replied_at).length;

        return {
          ...template,
          sent_count: sentCount,
          open_rate: sentCount > 0 ? (openCount / sentCount) * 100 : 0,
          click_rate: sentCount > 0 ? (clickCount / sentCount) * 100 : 0,
          reply_rate: sentCount > 0 ? (replyCount / sentCount) * 100 : 0,
        };
      });

      return templatesWithStats;
    },
  });
}

// Fetch single template
export function useEmailTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['email-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as EmailTemplate;
    },
    enabled: !!templateId,
  });
}

// Fetch variants for a template
export function useTemplateVariants(templateId: string | undefined) {
  return useQuery({
    queryKey: ['email-variants', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('email_variants')
        .select('*')
        .eq('template_id', templateId)
        .eq('is_active', true)
        .order('variant_name');

      if (error) throw error;
      return data as EmailVariant[];
    },
    enabled: !!templateId,
  });
}

// Create template
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'performance_score'>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(template as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-templates-with-stats'] });
    },
  });
}

// Update template
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-templates-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['email-template', variables.id] });
    },
  });
}

// Create variant
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variant: Omit<EmailVariant, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('email_variants')
        .insert(variant as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-variants', variables.template_id] });
    },
  });
}

// Update variant
export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, template_id, ...updates }: Partial<EmailVariant> & { id: string; template_id: string }) => {
      const { data, error } = await supabase
        .from('email_variants')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, template_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-variants', data.template_id] });
    },
  });
}

// Record email send
export function useRecordEmailSend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (send: Omit<EmailSend, 'id' | 'sent_at' | 'opened_at' | 'clicked_at' | 'replied_at' | 'bounced' | 'unsubscribed'>) => {
      const { data, error } = await supabase
        .from('email_sends')
        .insert(send as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates-with-stats'] });
    },
  });
}

// Get top performing templates
export function useTopTemplates(limit = 5) {
  const isEnabled = useFeatureFlags(state => state.isEnabled);

  return useQuery({
    queryKey: ['top-email-templates', limit],
    enabled: isEnabled('aiCrmPhase4'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .not('performance_score', 'is', null)
        .order('performance_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

// Personalize template content
export function personalizeTemplate(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, value || `[${key}]`);
  });
  return result;
}

// Get category label
export function getCategoryLabel(category: string): string {
  const cat = TEMPLATE_CATEGORIES.find(c => c.value === category);
  return cat ? `${cat.icon} ${cat.label}` : category;
}

// Get performance color
export function getPerformanceColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}
