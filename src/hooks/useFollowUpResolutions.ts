import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FollowUpResolution {
  id: string;
  suggestion_key: string;
  lead_id: string;
  resolved_at: string;
}

/**
 * Hook to manage follow-up suggestion resolutions (mark as done).
 */
export function useFollowUpResolutions() {
  const queryClient = useQueryClient();

  // Fetch all resolved suggestions
  const { data: resolutions = [], isLoading } = useQuery({
    queryKey: ['follow-up-resolutions'],
    queryFn: async (): Promise<FollowUpResolution[]> => {
      const { data, error } = await supabase
        .from('follow_up_resolutions')
        .select('id, suggestion_key, lead_id, resolved_at')
        .order('resolved_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Create a set of resolved suggestion keys for quick lookup
  const resolvedKeys = new Set(resolutions.map(r => r.suggestion_key));

  // Mutation to mark a suggestion as resolved
  const markAsResolved = useMutation({
    mutationFn: async ({ suggestionKey, leadId }: { suggestionKey: string; leadId: string }) => {
      const { data, error } = await supabase
        .from('follow_up_resolutions')
        .insert({
          suggestion_key: suggestionKey,
          lead_id: leadId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-resolutions'] });
      toast.success('Follow-up marked as done');
    },
    onError: (error) => {
      console.error('Error marking follow-up as resolved:', error);
      toast.error('Failed to mark as done');
    },
  });

  // Mutation to unmark a suggestion (undo)
  const unmarkResolved = useMutation({
    mutationFn: async (suggestionKey: string) => {
      const { error } = await supabase
        .from('follow_up_resolutions')
        .delete()
        .eq('suggestion_key', suggestionKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-resolutions'] });
      toast.success('Follow-up restored');
    },
    onError: (error) => {
      console.error('Error unmarking follow-up:', error);
      toast.error('Failed to restore');
    },
  });

  const isResolved = (suggestionKey: string) => resolvedKeys.has(suggestionKey);

  return {
    resolutions,
    isLoading,
    resolvedKeys,
    isResolved,
    markAsResolved,
    unmarkResolved,
  };
}
