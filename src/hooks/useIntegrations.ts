import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface Integration {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logo_url: string | null;
  is_active: boolean;
  is_beta: boolean;
  requires_api_key: boolean;
  requires_oauth: boolean;
  documentation_url: string | null;
  setup_instructions: string | null;
  pricing_info: { free_tier?: string; paid_from?: string } | null;
  features: string[];
  use_cases: string[];
  created_at: string;
}

export interface UserIntegration {
  id: string;
  user_id: string;
  integration_id: string;
  status: 'active' | 'inactive' | 'error' | 'pending_auth';
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  integration?: Integration;
}

export interface IntegrationLog {
  id: string;
  user_integration_id: string;
  action_type: string;
  status: 'success' | 'failed' | 'partial';
  request_data: Record<string, unknown> | null;
  response_data: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// Fetch all available integrations
export function useIntegrations(category?: string) {
  return useQuery({
    queryKey: ['integrations', category],
    queryFn: async () => {
      let query = supabase
        .from('integrations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        features: Array.isArray(item.features) ? item.features : [],
        use_cases: Array.isArray(item.use_cases) ? item.use_cases : [],
        pricing_info: item.pricing_info as Integration['pricing_info']
      })) as Integration[];
    }
  });
}

// Fetch user's connected integrations
export function useUserIntegrations() {
  return useQuery({
    queryKey: ['user-integrations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_integrations')
        .select(`
          *,
          integration:integrations(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        integration: item.integration ? {
          ...item.integration,
          features: Array.isArray(item.integration.features) ? item.integration.features : [],
          use_cases: Array.isArray(item.integration.use_cases) ? item.integration.use_cases : [],
          pricing_info: item.integration.pricing_info as Integration['pricing_info']
        } : undefined
      })) as UserIntegration[];
    }
  });
}

// Connect an integration
export function useConnectIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      integrationId, 
      config = {}, 
      credentials = {} 
    }: { 
      integrationId: string; 
      config?: Record<string, unknown>; 
      credentials?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_integrations')
        .insert({
          user_id: user.id,
          integration_id: integrationId,
          status: 'active',
          config: config as unknown as Json,
          credentials: credentials as unknown as Json
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-integrations'] });
      toast({ title: 'Integration connected successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to connect integration', description: error.message, variant: 'destructive' });
    }
  });
}

// Disconnect an integration
export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userIntegrationId: string) => {
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('id', userIntegrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-integrations'] });
      toast({ title: 'Integration disconnected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to disconnect', description: error.message, variant: 'destructive' });
    }
  });
}

// Update integration config
export function useUpdateIntegrationConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      userIntegrationId, 
      config 
    }: { 
      userIntegrationId: string; 
      config: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('user_integrations')
        .update({ 
          config: config as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', userIntegrationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-integrations'] });
      toast({ title: 'Settings saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' });
    }
  });
}

// Fetch integration logs
export function useIntegrationLogs(userIntegrationId?: string) {
  return useQuery({
    queryKey: ['integration-logs', userIntegrationId],
    queryFn: async () => {
      if (!userIntegrationId) return [];

      const { data, error } = await supabase
        .from('integration_logs')
        .select('*')
        .eq('user_integration_id', userIntegrationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as IntegrationLog[];
    },
    enabled: !!userIntegrationId
  });
}

// Get integration categories
export function useIntegrationCategories() {
  return useQuery({
    queryKey: ['integration-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;
      
      const categories = [...new Set(data?.map(d => d.category) || [])];
      return categories.sort();
    }
  });
}

// Category icons and labels
export const CATEGORY_CONFIG: Record<string, { icon: string; label: string }> = {
  automation: { icon: '🤖', label: 'Automation' },
  communication: { icon: '💬', label: 'Communication' },
  productivity: { icon: '📊', label: 'Productivity' },
  calendar: { icon: '📅', label: 'Calendar' },
  crm: { icon: '👥', label: 'CRM' },
  marketing: { icon: '🎨', label: 'Marketing' },
  phone: { icon: '📞', label: 'Phone' },
  documents: { icon: '📄', label: 'Documents' },
  payment: { icon: '💳', label: 'Payment' },
  accounting: { icon: '💰', label: 'Accounting' }
};
