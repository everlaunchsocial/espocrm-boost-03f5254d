import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface LogAcceptedParams {
  suggestionText: string;
  suggestionType: string;
  leadId?: string;
  demoId?: string;
}

interface ConfirmActionParams {
  suggestionText: string;
  suggestionType: string;
}

export function useFollowupLearning() {
  const { isEnabled } = useFeatureFlags();

  // Log when a suggestion is accepted (clicked)
  const logAccepted = useMutation({
    mutationFn: async ({ suggestionText, suggestionType, leadId, demoId }: LogAcceptedParams) => {
      // Skip if feature flag is disabled
      if (!isEnabled('aiCrmPhase1')) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('followup_learning_log')
        .insert({
          user_id: user.id,
          suggestion_text: suggestionText,
          suggestion_type: suggestionType,
          accepted: true,
          confirmed: false,
          confidence_score: 0.5,
          lead_id: leadId || null,
          demo_id: demoId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Mark the action as confirmed (completed)
  const confirmAction = useMutation({
    mutationFn: async ({ suggestionText, suggestionType }: ConfirmActionParams) => {
      // Skip if feature flag is disabled
      if (!isEnabled('aiCrmPhase1')) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find the most recent accepted but not confirmed log entry
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: logs, error: fetchError } = await supabase
        .from('followup_learning_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('suggestion_text', suggestionText)
        .eq('suggestion_type', suggestionType)
        .eq('accepted', true)
        .eq('confirmed', false)
        .gte('recorded_at', fiveMinutesAgo)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;
      if (!logs || logs.length === 0) {
        console.log('No matching log entry found to confirm');
        return null;
      }

      const { data, error } = await supabase
        .from('followup_learning_log')
        .update({ confirmed: true })
        .eq('id', logs[0].id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  return {
    logAccepted: logAccepted.mutate,
    confirmAction: confirmAction.mutate,
    isLogging: logAccepted.isPending,
    isConfirming: confirmAction.isPending,
  };
}
