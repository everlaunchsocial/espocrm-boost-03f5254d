import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BillingConfiguration {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  setup_fee: number;
  charge_first_month: boolean;
  billing_delay_days: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface BillingConfigurationChange {
  id: string;
  changed_by: string | null;
  old_configuration_name: string | null;
  new_configuration_name: string;
  changed_at: string;
  note: string | null;
}

export function useBillingConfigurations() {
  return useQuery({
    queryKey: ['billing-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_configurations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as BillingConfiguration[];
    },
  });
}

export function useActiveBillingConfiguration() {
  return useQuery({
    queryKey: ['billing-configuration-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_configurations')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data as BillingConfiguration;
    },
  });
}

export function useBillingConfigurationChanges() {
  return useQuery({
    queryKey: ['billing-configuration-changes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_configuration_changes')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as BillingConfigurationChange[];
    },
  });
}

export function useUpdateActiveBillingConfiguration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      newConfigName, 
      oldConfigName, 
      note 
    }: { 
      newConfigName: string; 
      oldConfigName: string | null;
      note?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deactivate all configurations
      const { error: deactivateError } = await supabase
        .from('billing_configurations')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      if (deactivateError) throw deactivateError;

      // Activate the selected configuration
      const { error: activateError } = await supabase
        .from('billing_configurations')
        .update({ is_active: true })
        .eq('name', newConfigName);

      if (activateError) throw activateError;

      // Log the change
      const { error: logError } = await supabase
        .from('billing_configuration_changes')
        .insert({
          changed_by: user.id,
          old_configuration_name: oldConfigName,
          new_configuration_name: newConfigName,
          note: note || null,
        });

      if (logError) throw logError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['billing-configuration-active'] });
      queryClient.invalidateQueries({ queryKey: ['billing-configuration-changes'] });
      toast({
        title: 'Billing Model Updated',
        description: 'The active billing model has been changed. New signups will use this model.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
