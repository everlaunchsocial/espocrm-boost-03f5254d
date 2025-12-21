import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VoiceSummaryPreferences {
  id: string;
  user_id: string;
  enable_voice_summary: boolean;
  summary_delivery_time: string;
  include_followup_reminders: boolean;
  created_at: string;
  updated_at: string;
}

const defaultPreferences = {
  enable_voice_summary: true,
  summary_delivery_time: '09:00:00',
  include_followup_reminders: true,
};

export function useVoiceSummaryPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['voice-summary-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Return existing preferences or defaults
      return data || {
        ...defaultPreferences,
        user_id: user.id,
      };
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<VoiceSummaryPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_preferences')
          .update({
            enable_voice_summary: updates.enable_voice_summary,
            summary_delivery_time: updates.summary_delivery_time,
            include_followup_reminders: updates.include_followup_reminders,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            enable_voice_summary: updates.enable_voice_summary ?? defaultPreferences.enable_voice_summary,
            summary_delivery_time: updates.summary_delivery_time ?? defaultPreferences.summary_delivery_time,
            include_followup_reminders: updates.include_followup_reminders ?? defaultPreferences.include_followup_reminders,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-summary-preferences'] });
      toast.success('Preferences saved');
    },
    onError: (error) => {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
